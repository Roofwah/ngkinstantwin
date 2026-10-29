const crypto = require('crypto');

/** Same string as puk-firmware/main/puk_offline_code.c PUK_DEMO_SEED. */
const PUK_DEMO_SEED = process.env.PUK_DEMO_SEED || 'puk-demo-seed-v1';

/** Demo units share one seed. Each keeps its own id and its own counter. */
const PUK_DEMO_DEVICES = new Set(['PR-PUK2-001', 'PR-PUK2-002', 'PR-PUK2-004']);

/** The play is recorded as generated this long before the phone hits the server. */
const PUK_DEMO_ISSUED_OFFSET_MS = 22 * 1000;

const SHORT_TO_DEVICE = {
  '001': 'PR-PUK2-001',
  '002': 'PR-PUK2-002',
  '004': 'PR-PUK2-004',
};

function canonical(deviceCode, counter, campaignId, location) {
  return `1|${deviceCode}|${counter}|${campaignId}|${location || '-'}`;
}

function sign(deviceCode, counter, campaignId, location) {
  return crypto
    .createHmac('sha256', PUK_DEMO_SEED)
    .update(canonical(deviceCode, counter, campaignId, location))
    .digest('hex')
    .slice(0, 16);
}

function canonicalShort(deviceCode, counter, campaignId, location) {
  return `2|${deviceCode}|${counter}|${campaignId}|${location || '-'}`;
}

function signShort(deviceCode, counter, campaignId, location) {
  return crypto
    .createHmac('sha256', PUK_DEMO_SEED)
    .update(canonicalShort(deviceCode, counter, campaignId, location))
    .digest('hex')
    .slice(0, 8);
}

function signaturesMatch(sig, expect) {
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyLegacyCode(token) {
  const parts = String(token || '').split('~');
  if (parts.length !== 6 || parts[0] !== '1') return null;

  const deviceCode = parts[1];
  const counter = parts[2];
  const campaignId = parts[3];
  const locationPart = parts[4];
  const sig = parts[5];

  if (!PUK_DEMO_DEVICES.has(deviceCode)) return null;
  if (!/^[1-9][0-9]{0,9}$/.test(counter)) return null;
  if (!/^[A-Za-z0-9-]{1,47}$/.test(campaignId)) return null;
  if (!/^[0-9a-f]{16}$/.test(sig)) return null;

  let location = '';
  if (locationPart !== '-') {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(locationPart)) return null;
    try {
      location = Buffer.from(locationPart, 'base64url').toString('utf8');
    } catch {
      return null;
    }
    if (!location || location.length > 48 || /[|~\r\n]/.test(location)) return null;
  }

  if (!signaturesMatch(sig, sign(deviceCode, counter, campaignId, location))) return null;

  return {
    deviceCode,
    counter: Number(counter),
    campaignId,
    location,
  };
}

function shopFromSegment(segment) {
  if (!segment || segment === '-') return '';
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(segment)) return null;
  const location = segment.replace(/_/g, ' ').trim();
  if (!location || location.length > 48) return null;
  return location;
}

function verifyShortCode(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 4 && parts.length !== 5) return null;

  const deviceCode = SHORT_TO_DEVICE[parts[0]];
  const counter = parts[1];
  const campaignId = parts[2];
  const shopPart = parts.length === 5 ? parts[3] : '-';
  const sig = parts[parts.length - 1];

  if (!deviceCode) return null;
  if (!/^[1-9][0-9]{0,9}$/.test(counter)) return null;
  if (!/^[A-Za-z0-9-]{1,47}$/.test(campaignId)) return null;
  if (!/^[0-9a-f]{8}$/.test(sig)) return null;

  const location = shopFromSegment(shopPart);
  if (location === null) return null;

  if (!signaturesMatch(sig, signShort(deviceCode, counter, campaignId, location))) return null;

  return {
    deviceCode,
    counter: Number(counter),
    campaignId,
    location,
  };
}

function verifyOfflineCode(token) {
  const raw = String(token || '');
  if (raw.startsWith('1~')) return verifyLegacyCode(raw);
  return verifyShortCode(raw);
}

module.exports = {
  PUK_DEMO_SEED,
  PUK_DEMO_DEVICES,
  PUK_DEMO_ISSUED_OFFSET_MS,
  canonical,
  sign,
  verifyOfflineCode,
};
