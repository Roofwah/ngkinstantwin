const crypto = require('crypto');
const db = require('../db');

const CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const REDEMPTION_STATUS = {
  AWAITING: 'AWAITING_FULFILMENT',
  SHIP_TO_STORE: 'SHIP_TO_STORE',
  FULFILLED: 'FULFILLED',
};

function redemptionStatusLabel(status) {
  const key = String(status || REDEMPTION_STATUS.AWAITING);
  switch (key) {
    case REDEMPTION_STATUS.FULFILLED:
      return 'Fulfilled from store stock';
    case REDEMPTION_STATUS.SHIP_TO_STORE:
      return 'No stock — order to store';
    case REDEMPTION_STATUS.AWAITING:
      return 'Awaiting fulfilment';
    default:
      return key.replace(/_/g, ' ');
  }
}

function generateRedemptionCode() {
  let body = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    body += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return `PR-${body}`;
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

/** Ensure a winner claim has both redemption code and fulfilment token before notify. */
function ensureWinnerRedemption(claimId) {
  let claim = db.prepare('SELECT * FROM claims WHERE claimId = ?').get(claimId);
  if (!claim) return null;

  if (claim.redemptionCode && claim.fulfilmentToken) {
    return claim;
  }

  if (claim.redemptionCode && !claim.fulfilmentToken) {
    const fulfilmentToken = generateFulfilmentToken();
    db.prepare(`
      UPDATE claims
      SET fulfilmentToken = ?, redemptionStatus = 'AWAITING_FULFILMENT'
      WHERE claimId = ?
    `).run(fulfilmentToken, claimId);
    return db.prepare('SELECT * FROM claims WHERE claimId = ?').get(claimId);
  }

  attachRedemption(claimId);
  return db.prepare('SELECT * FROM claims WHERE claimId = ?').get(claimId);
}

function getClaimByFulfilmentToken(token) {
  if (!token) return null;
  return db.prepare('SELECT * FROM claims WHERE fulfilmentToken = ?').get(token);
}

function validateFulfilledBy(fulfilledBy) {
  const name = String(fulfilledBy || '').trim();
  if (name.length < 2) {
    return { error: 'Enter the name of the staff member confirming this action', status: 400 };
  }
  return { name };
}

function markFulfilled(token, fulfilledBy, outcome = 'fulfilled', options = {}) {
  const claim = getClaimByFulfilmentToken(token);
  if (!claim) return { error: 'Fulfilment record not found', status: 404 };

  const mode = outcome === 'ship_to_store' ? 'ship_to_store' : 'fulfilled';
  const nextStatus = mode === 'ship_to_store'
    ? REDEMPTION_STATUS.SHIP_TO_STORE
    : REDEMPTION_STATUS.FULFILLED;

  if (claim.redemptionStatus === REDEMPTION_STATUS.FULFILLED) {
    return { already: true, claim };
  }
  if (claim.redemptionStatus === REDEMPTION_STATUS.SHIP_TO_STORE) {
    if (mode === 'ship_to_store') return { already: true, claim };
    return {
      error: 'This prize was already confirmed as order to store',
      status: 409,
    };
  }

  const expiresAt = Number(claim.redemptionExpiresAt) || 0;
  const expired = expiresAt > 0 && Date.now() >= expiresAt;
  if (expired && !options.allowExpired) {
    return {
      error: 'Redemption window expired',
      status: 409,
      expired: true,
      claim,
    };
  }

  const staff = validateFulfilledBy(fulfilledBy);
  if (staff.error) return staff;

  const now = Date.now();
  const redeemedAfterExpiry = expired ? 1 : 0;
  const result = db.prepare(`
    UPDATE claims
    SET redemptionStatus = ?, fulfilledAt = ?, fulfilledBy = ?, redeemedAfterExpiry = ?
    WHERE fulfilmentToken = ?
      AND (redemptionStatus IS NULL OR redemptionStatus = ?)
  `).run(
    nextStatus,
    now,
    staff.name,
    redeemedAfterExpiry,
    token,
    REDEMPTION_STATUS.AWAITING,
  );

  const updated = getClaimByFulfilmentToken(token);
  if (!result.changes) {
    if (updated?.redemptionStatus === REDEMPTION_STATUS.FULFILLED
      || updated?.redemptionStatus === REDEMPTION_STATUS.SHIP_TO_STORE) {
      return { already: true, claim: updated };
    }
    return { error: 'Fulfilment record could not be updated', status: 409, claim: updated };
  }

  return {
    already: false,
    outcome: mode,
    expired,
    claim: updated,
  };
}

module.exports = {
  REDEMPTION_STATUS,
  redemptionStatusLabel,
  generateRedemptionCode,
  generateFulfilmentToken,
  attachRedemption,
  ensureWinnerRedemption,
  getClaimByFulfilmentToken,
  markFulfilled,
};
