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

// ─── Turnstyle Lab API ────────────────────────────────────────────

export async function createLabSession(payload) {
  const res = await fetch(`${BASE}/lab/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function pollLabSession(sessionId) {
  const res = await fetch(`${BASE}/lab/session/${encodeURIComponent(sessionId)}`);
  return handleResponse(res);
}

export async function getLabSessionReport(sessionId) {
  const res = await fetch(`${BASE}/lab/session/${encodeURIComponent(sessionId)}/report`);
  return handleResponse(res);
}

export async function postLabEvent(sessionId, stage, meta = {}) {
  if (!sessionId) return null;
  const res = await fetch(`${BASE}/lab/session/${encodeURIComponent(sessionId)}/event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage, ...meta }),
  });
  return handleResponse(res);
}

export async function updateLabSessionRules(sessionId, rules) {
  const res = await fetch(`${BASE}/lab/session/${encodeURIComponent(sessionId)}/rules`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rules),
  });
  return handleResponse(res);
}

export async function syncLabSessionAccessPoint(sessionId, accessPoint) {
  const res = await fetch(`${BASE}/lab/session/${encodeURIComponent(sessionId)}/access-point`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(accessPoint),
  });
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
  customerName,
  mobile,
  invoiceNumber,
  purchaseDate,
  purchaseTime,
  storeCode,
  storeName,
  productDescription,
  selectedBrand,
  spendAmount,
  contractNumber,
  receiptSource,
  verificationMethod,
  receiptFile,
  campaignId,
  labSessionId,
  postcode,
}) {
  const fd = new FormData();
  fd.append('deviceCode', deviceCode);
  if (customerName) fd.append('customerName', customerName);
  fd.append('mobile', mobile);
  if (invoiceNumber) fd.append('invoiceNumber', invoiceNumber);
  if (purchaseDate) fd.append('purchaseDate', purchaseDate);
  if (storeCode) fd.append('storeCode', storeCode);
  if (purchaseTime) fd.append('purchaseTime', purchaseTime);
  if (storeName) fd.append('storeName', storeName);
  if (productDescription) fd.append('productDescription', productDescription);
  if (postcode) fd.append('postcode', postcode);
  if (contractNumber) fd.append('contractNumber', contractNumber);
  fd.append('selectedBrand', selectedBrand);
  fd.append('spendAmount', String(spendAmount));
  if (receiptSource) fd.append('receiptSource', receiptSource);
  if (verificationMethod) fd.append('verificationMethod', verificationMethod);
  if (campaignId) fd.append('campaignId', campaignId);
  if (labSessionId) fd.append('labSessionId', labSessionId);
  if (receiptFile) fd.append('receipt', receiptFile);

  const res = await fetch(`${BASE}/device/direct-claim`, { method: 'POST', body: fd });
  return handleResponse(res);
}

export async function submitTokenClaim({
  tokenId,
  customerName,
  mobile,
  invoiceNumber,
  purchaseDate,
  purchaseTime,
  storeCode,
  storeName,
  productDescription,
  selectedBrand,
  spendAmount,
  contractNumber,
  receiptSource,
  verificationMethod,
  receiptFile,
  postcode,
}) {
  const fd = new FormData();
  fd.append('tokenId', tokenId);
  if (customerName) fd.append('customerName', customerName);
  fd.append('mobile', mobile);
  if (invoiceNumber) fd.append('invoiceNumber', invoiceNumber);
  if (purchaseDate) fd.append('purchaseDate', purchaseDate);
  if (storeCode) fd.append('storeCode', storeCode);
  if (purchaseTime) fd.append('purchaseTime', purchaseTime);
  if (storeName) fd.append('storeName', storeName);
  if (productDescription) fd.append('productDescription', productDescription);
  if (postcode) fd.append('postcode', postcode);
  if (contractNumber) fd.append('contractNumber', contractNumber);
  fd.append('selectedBrand', selectedBrand);
  fd.append('spendAmount', String(spendAmount));
  if (receiptSource) fd.append('receiptSource', receiptSource);
  if (verificationMethod) fd.append('verificationMethod', verificationMethod);
  if (receiptFile) fd.append('receipt', receiptFile);

  const res = await fetch(`${BASE}/device/claim`, { method: 'POST', body: fd });
  return handleResponse(res);
}

export async function getFulfilment(token) {
  const res = await fetch(`${BASE}/fulfil/${encodeURIComponent(token)}`);
  return handleResponse(res);
}

export async function completeFulfilment(token, fulfilledBy) {
  const res = await fetch(`${BASE}/fulfil/${encodeURIComponent(token)}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fulfilledBy }),
  });
  return handleResponse(res);
}

// ─── Admin API ────────────────────────────────────────────────────

export async function adminLogin(password) {
  const res = await fetch(`${BASE}/admin/stats`, {
    headers: { 'x-admin-token': password },
  });
  return handleResponse(res);
}

function campaignQuery(campaignId) {
  return campaignId ? `?campaignId=${encodeURIComponent(campaignId)}` : '';
}

export async function getAdminCampaigns() {
  const res = await fetch(`${BASE}/admin/campaigns`, { headers: adminHeaders() });
  return handleResponse(res);
}

export async function getAdminStats(campaignId) {
  const res = await fetch(`${BASE}/admin/stats${campaignQuery(campaignId)}`, { headers: adminHeaders() });
  return handleResponse(res);
}

export async function getAdminClaims(campaignId) {
  const res = await fetch(`${BASE}/admin/claims${campaignQuery(campaignId)}`, { headers: adminHeaders() });
  return handleResponse(res);
}

export async function getAdminManifest(campaignId) {
  const res = await fetch(`${BASE}/admin/manifest${campaignQuery(campaignId)}`, { headers: adminHeaders() });
  return handleResponse(res);
}

export async function getAdminAudit(campaignId) {
  const res = await fetch(`${BASE}/admin/audit${campaignQuery(campaignId)}`, { headers: adminHeaders() });
  return handleResponse(res);
}

export async function generateManifest(windowHours = 24, campaignId) {
  const res = await fetch(`${BASE}/admin/generate-manifest`, {
    method: 'POST',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ windowHours, campaignId }),
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

export async function getDemoControl(campaignId) {
  const res = await fetch(`${BASE}/admin/demo-control${campaignQuery(campaignId)}`, { headers: adminHeaders() });
  return handleResponse(res);
}

export async function saveDemoControl(campaignId, payload) {
  const res = await fetch(`${BASE}/admin/demo-control`, {
    method: 'PUT',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ ...payload, campaignId }),
  });
  return handleResponse(res);
}

export async function resetDemoSequence(campaignId) {
  const res = await fetch(`${BASE}/admin/demo-control/reset-sequence`, {
    method: 'POST',
    headers: adminHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ campaignId }),
  });
  return handleResponse(res);
}
