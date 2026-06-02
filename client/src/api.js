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
