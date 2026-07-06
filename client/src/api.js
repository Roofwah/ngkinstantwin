const BASE = '/api';

function adminHeaders(extra = {}) {
  const token = localStorage.getItem('adminToken');
  return token ? { 'x-admin-token': token, ...extra } : extra;
}

async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ─── Public claim API ─────────────────────────────────────────────

export async function submitClaim(formData) {
  const res = await fetch(`${BASE}/claims`, { method: 'POST', body: formData });
  return handleResponse(res);
}

export async function getClaim(claimId) {
  const res = await fetch(`${BASE}/claims/${claimId}`);
  return handleResponse(res);
}

export async function revealClaim(claimId) {
  const res = await fetch(`${BASE}/claims/${claimId}/reveal`, { method: 'POST' });
  return handleResponse(res);
}

// ─── OTP API ──────────────────────────────────────────────────────

export async function sendOtp(mobile) {
  const res = await fetch(`${BASE}/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile }),
  });
  return handleResponse(res);
}

export async function verifyOtp(mobile, code) {
  const res = await fetch(`${BASE}/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, code }),
  });
  return handleResponse(res);
}

// ─── Device / Token API ───────────────────────────────────────

export async function issueToken(deviceCode) {
  const res = await fetch(`${BASE}/device/issue-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceCode }),
  });
  return handleResponse(res);
}

export async function getDeviceConfig(deviceCode) {
  const res = await fetch(`${BASE}/device/config?deviceCode=${encodeURIComponent(deviceCode)}`);
  return handleResponse(res);
}

export async function setDemoCampaign(campaignId) {
  const res = await fetch(`${BASE}/device/demo-campaign`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId }),
  });
  return handleResponse(res);
}

export async function validateToken(token) {
  const res = await fetch(`${BASE}/device/token/${token}`);
  return handleResponse(res);
}

export async function pollTokenStatus(token) {
  const res = await fetch(`${BASE}/device/token-status/${token}`);
  return handleResponse(res);
}

export async function submitDirectClaim({
  deviceCode,
  mobile,
  invoiceNumber,
  purchaseDate,
  purchaseTime,
  storeCode,
  storeName,
  productDescription,
  selectedBrand,
  spendAmount,
  receiptSource,
  verificationMethod,
  receiptFile,
  campaignId,
}) {
  const fd = new FormData();
  fd.append('deviceCode', deviceCode);
  fd.append('mobile', mobile);
  fd.append('invoiceNumber', invoiceNumber);
  fd.append('purchaseDate', purchaseDate);
  if (storeCode) fd.append('storeCode', storeCode);
  if (purchaseTime) fd.append('purchaseTime', purchaseTime);
  if (storeName) fd.append('storeName', storeName);
  if (productDescription) fd.append('productDescription', productDescription);
  fd.append('selectedBrand', selectedBrand);
  fd.append('spendAmount', String(spendAmount));
  fd.append('receiptSource', receiptSource);
  fd.append('verificationMethod', verificationMethod);
  if (campaignId) fd.append('campaignId', campaignId);
  if (receiptFile) fd.append('receipt', receiptFile);

  const res = await fetch(`${BASE}/device/direct-claim`, { method: 'POST', body: fd });
  return handleResponse(res);
}

export async function submitTokenClaim({
  tokenId,
  mobile,
  invoiceNumber,
  purchaseDate,
  purchaseTime,
  storeCode,
  storeName,
  productDescription,
  selectedBrand,
  spendAmount,
  receiptSource,
  verificationMethod,
  receiptFile,
}) {
  const fd = new FormData();
  fd.append('tokenId', tokenId);
  fd.append('mobile', mobile);
  fd.append('invoiceNumber', invoiceNumber);
  fd.append('purchaseDate', purchaseDate);
  if (storeCode) fd.append('storeCode', storeCode);
  if (purchaseTime) fd.append('purchaseTime', purchaseTime);
  if (storeName) fd.append('storeName', storeName);
  if (productDescription) fd.append('productDescription', productDescription);
  fd.append('selectedBrand', selectedBrand);
  fd.append('spendAmount', String(spendAmount));
  fd.append('receiptSource', receiptSource);
  fd.append('verificationMethod', verificationMethod);
  if (receiptFile) fd.append('receipt', receiptFile);

  const res = await fetch(`${BASE}/device/claim`, { method: 'POST', body: fd });
  return handleResponse(res);
}

// ─── Admin API ────────────────────────────────────────────────────

export async function adminLogin(password) {
  const res = await fetch(`${BASE}/admin/stats`, {
    headers: { 'x-admin-token': password },
  });
  return handleResponse(res);
}

export async function getAdminStats() {
  const res = await fetch(`${BASE}/admin/stats`, { headers: adminHeaders() });
  return handleResponse(res);
}

export async function getAdminClaims() {
  const res = await fetch(`${BASE}/admin/claims`, { headers: adminHeaders() });
  return handleResponse(res);
}

export async function getAdminManifest() {
  const res = await fetch(`${BASE}/admin/manifest`, { headers: adminHeaders() });
  return handleResponse(res);
}

export async function getAdminAudit() {
  const res = await fetch(`${BASE}/admin/audit`, { headers: adminHeaders() });
  return handleResponse(res);
}

export async function generateManifest(windowHours = 24) {
  const res = await fetch(`${BASE}/admin/generate-manifest`, {
    method: 'POST',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ windowHours }),
  });
  return handleResponse(res);
}

export async function reconcileClaim(claimId, action, adminNote) {
  const res = await fetch(`${BASE}/admin/reconcile`, {
    method: 'POST',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ claimId, action, adminNote }),
  });
  return handleResponse(res);
}
