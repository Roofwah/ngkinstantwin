const db = require('../db');

/** Shown only when a real PUK entry-token issue time exists. Matches the 10-minute entry token TTL. */
const ELIGIBLE_LOOKBACK_MS = 10 * 60 * 1000;
const DEFAULT_WINDOW_MINUTES = 30;

function parseConfig(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function customerQrSettings(claim) {
  if (!claim?.campaignId) return null;
  const row = db.prepare('SELECT brand, name, config FROM campaigns WHERE id = ?').get(claim.campaignId);
  if (!row) return null;
  const config = parseConfig(row.config);
  if (config.customerQrRedemption !== true) return null;

  const minutes = Number(config.redemptionWindowMinutes);
  const windowMinutes = Number.isFinite(minutes) && minutes > 0
    ? minutes
    : DEFAULT_WINDOW_MINUTES;
  const theme = config.customerWinTheme || {};

  return {
    brand: row.brand || row.name || 'Prize',
    storeName: config.defaultStoreName || '',
    minutes: windowMinutes,
    windowMs: windowMinutes * 60 * 1000,
    theme: {
      background: theme.background || '#000000',
      accent: theme.accent || config.themeColor || '#E10600',
      text: theme.text || '#ffffff',
    },
  };
}

/** Start the redemption window once. Later calls do not move the expiry. */
function armRedemptionWindow(claim) {
  const settings = customerQrSettings(claim);
  if (!settings || !claim?.claimId) return claim;
  if (Number(claim.redemptionExpiresAt) > 0) return claim;

  const expiresAt = Date.now() + settings.windowMs;
  db.prepare(`
    UPDATE claims
    SET redemptionExpiresAt = ?
    WHERE claimId = ? AND redemptionExpiresAt IS NULL
  `).run(expiresAt, claim.claimId);

  return db.prepare('SELECT * FROM claims WHERE claimId = ?').get(claim.claimId);
}

function pukQrIssuedAt(claimId) {
  if (!claimId) return null;
  const row = db.prepare(`
    SELECT issuedAt FROM issued_tokens
    WHERE claimId = ?
    ORDER BY issuedAt ASC
    LIMIT 1
  `).get(claimId);
  return row?.issuedAt || null;
}

function redemptionFlags(claim, now = Date.now()) {
  const status = claim?.redemptionStatus || 'AWAITING_FULFILMENT';
  const redeemed = status === 'FULFILLED' || status === 'SHIP_TO_STORE';
  const expiresAt = Number(claim?.redemptionExpiresAt) || null;
  const expired = Boolean(!redeemed && expiresAt && now >= expiresAt);
  return { status, redeemed, expiresAt, expired };
}

function publicCustomerWin(claim, baseUrl) {
  const settings = customerQrSettings(claim);
  if (!settings || !claim?.fulfilmentToken) return null;
  const now = Date.now();
  const flags = redemptionFlags(claim, now);
  const root = String(baseUrl || '').replace(/\/$/, '');
  return {
    campaignId: claim.campaignId,
    brand: settings.brand,
    storeName: claim.storeName || settings.storeName,
    prize: claim.prizeName || 'Prize',
    redemptionCode: claim.redemptionCode || null,
    expiresAt: flags.expiresAt,
    serverNow: now,
    windowMinutes: settings.minutes,
    status: flags.status,
    redeemed: flags.redeemed,
    expired: flags.expired,
    redeemedAfterExpiry: Boolean(claim.redeemedAfterExpiry),
    qrAvailable: !flags.redeemed,
    staffScanUrl: `${root}/fulfil/${claim.fulfilmentToken}`,
    theme: settings.theme,
  };
}

function publicStaffQrContext(claim) {
  const settings = customerQrSettings(claim);
  if (!settings) return { customerQrRedemption: false };

  const now = Date.now();
  const flags = redemptionFlags(claim, now);
  const issuedAt = pukQrIssuedAt(claim.claimId);

  return {
    customerQrRedemption: true,
    brand: settings.brand,
    prizeAwardedAt: claim.createdAt || null,
    pukQrGeneratedAt: issuedAt,
    eligiblePurchaseWindow: issuedAt
      ? { start: issuedAt - ELIGIBLE_LOOKBACK_MS, end: issuedAt }
      : null,
    redemptionExpiresAt: flags.expiresAt,
    serverNow: now,
    expired: flags.expired,
    redeemed: flags.redeemed,
    redeemedAfterExpiry: Boolean(claim.redeemedAfterExpiry),
    windowMinutes: settings.minutes,
    theme: settings.theme,
  };
}

module.exports = {
  ELIGIBLE_LOOKBACK_MS,
  customerQrSettings,
  armRedemptionWindow,
  publicCustomerWin,
  publicStaffQrContext,
  redemptionFlags,
};
