const crypto = require('crypto');
const db = require('../db');

const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generateRedemptionCode() {
  let body = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    body += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return `HOKA-${body}`;
}

function generateFulfilmentToken() {
  return crypto.randomBytes(24).toString('hex');
}

function attachRedemption(claimId) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const redemptionCode = generateRedemptionCode();
    const fulfilmentToken = generateFulfilmentToken();
    try {
      db.prepare(`
        UPDATE claims
        SET redemptionCode = ?, fulfilmentToken = ?, redemptionStatus = 'AWAITING_FULFILMENT'
        WHERE claimId = ?
      `).run(redemptionCode, fulfilmentToken, claimId);
      return { redemptionCode, fulfilmentToken };
    } catch (err) {
      if (!String(err.message || '').includes('UNIQUE')) throw err;
    }
  }
  throw new Error('Could not allocate a unique redemption code');
}

function getClaimByFulfilmentToken(token) {
  if (!token) return null;
  return db.prepare('SELECT * FROM claims WHERE fulfilmentToken = ?').get(token);
}

function markFulfilled(token) {
  const claim = getClaimByFulfilmentToken(token);
  if (!claim) return { error: 'Fulfilment record not found', status: 404 };
  if (claim.redemptionStatus === 'FULFILLED') {
    return { already: true, claim };
  }
  const now = Date.now();
  db.prepare(`
    UPDATE claims SET redemptionStatus = 'FULFILLED', fulfilledAt = ? WHERE fulfilmentToken = ?
  `).run(now, token);
  return { already: false, claim: { ...claim, redemptionStatus: 'FULFILLED', fulfilledAt: now } };
}

module.exports = {
  generateRedemptionCode,
  generateFulfilmentToken,
  attachRedemption,
  getClaimByFulfilmentToken,
  markFulfilled,
};
