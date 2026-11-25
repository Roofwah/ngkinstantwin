/** Campaign market regions — AU / NZ / US. Default AU keeps existing campaigns unchanged. */

const REGIONS = {
  AU: {
    id: 'AU',
    label: 'Australia',
    locale: 'en-AU',
    birdChannelEnv: 'BIRD_CHANNEL_ID',
    mobileHint: '04XX XXX XXX',
    invalidMobileMessage: 'Valid Australian mobile required',
  },
  NZ: {
    id: 'NZ',
    label: 'New Zealand',
    locale: 'en-NZ',
    birdChannelEnv: 'BIRD_CHANNEL_ID_NZ',
    mobileHint: '02X XXX XXXX',
    invalidMobileMessage: 'Valid New Zealand mobile required',
  },
  US: {
    id: 'US',
    label: 'United States',
    locale: 'en-US',
    birdChannelEnv: 'BIRD_CHANNEL_ID_US',
    mobileHint: '(555) 123-4567',
    invalidMobileMessage: 'Valid US mobile required',
  },
};

function resolveRegion(raw) {
  const key = String(raw || 'AU').trim().toUpperCase();
  return REGIONS[key] || REGIONS.AU;
}

function campaignRegion(campaign) {
  return resolveRegion(campaign?.config?.region || campaign?.region);
}

function digitsOnly(raw) {
  return String(raw || '').replace(/\D/g, '');
}

/** Canonical storage form per region (AU/NZ national, US E.164). */
function normaliseMobileForRegion(raw, regionId) {
  const region = resolveRegion(regionId);
  const s = String(raw || '').replace(/[\s\-()]/g, '');

  if (region.id === 'AU') {
    if (/^\+614\d{8}$/.test(s)) return `0${s.slice(3)}`;
    if (/^614\d{8}$/.test(s)) return `0${s.slice(2)}`;
    return s;
  }

  if (region.id === 'NZ') {
    if (/^\+642\d{7,9}$/.test(s)) return `0${s.slice(3)}`;
    if (/^642\d{7,9}$/.test(s)) return `0${s.slice(2)}`;
    return s;
  }

  // US
  if (/^\+1\d{10}$/.test(s)) return s;
  const d = digitsOnly(s);
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  if (d.length === 10) return `+1${d}`;
  return s.startsWith('+') ? s : (d ? `+${d}` : s);
}

function isValidMobileForRegion(normalised, regionId) {
  const region = resolveRegion(regionId);
  if (region.id === 'AU') return /^04\d{8}$/.test(normalised);
  if (region.id === 'NZ') return /^02\d{7,9}$/.test(normalised);
  if (region.id === 'US') return /^\+1\d{10}$/.test(normalised);
  return false;
}

function toE164ForRegion(mobile, regionId) {
  const region = resolveRegion(regionId);
  const norm = normaliseMobileForRegion(mobile, region.id);

  if (region.id === 'AU') {
    if (/^\+61/.test(norm)) return norm;
    if (/^04\d{8}$/.test(norm)) return `+61${norm.slice(1)}`;
    return norm;
  }

  if (region.id === 'NZ') {
    if (/^\+64/.test(norm)) return norm;
    if (/^0\d+$/.test(norm)) return `+64${norm.slice(1)}`;
    return norm;
  }

  // US already canonical +1…
  if (/^\+1\d{10}$/.test(norm)) return norm;
  return norm;
}

function birdChannelIdForRegion(regionId) {
  const region = resolveRegion(regionId);
  const specific = String(process.env[region.birdChannelEnv] || '').trim();
  if (specific) return specific;
  // AU also accepts legacy BIRD_CHANNEL_ID (same env key); others must be explicit
  if (region.id === 'AU') {
    return String(process.env.BIRD_CHANNEL_ID || '').trim();
  }
  return '';
}

/**
 * Whether this region can send real OTP SMS.
 * US uses the newer platform API (BIRD_API_KEY + BIRD_SMS_FROM_US), not a Channel UUID.
 */
function birdSmsReadyForRegion(regionId) {
  const region = resolveRegion(regionId);
  if (region.id === 'US') {
    const apiKey = String(process.env.BIRD_API_KEY || '').trim();
    const from = String(process.env.BIRD_SMS_FROM_US || '').trim();
    return apiKey.length > 0 && from.length > 0;
  }
  return Boolean(birdChannelIdForRegion(region.id));
}

module.exports = {
  REGIONS,
  resolveRegion,
  campaignRegion,
  normaliseMobileForRegion,
  isValidMobileForRegion,
  toE164ForRegion,
  birdChannelIdForRegion,
  birdSmsReadyForRegion,
};
