/** Client-side campaign market helpers — AU / NZ / US. */

export const REGIONS = {
  AU: {
    id: 'AU',
    mobileHint: '04XX XXX XXX',
    invalidMobileMessage: 'Enter a valid mobile (04XX XXX XXX)',
  },
  NZ: {
    id: 'NZ',
    mobileHint: '02X XXX XXXX',
    invalidMobileMessage: 'Enter a valid NZ mobile (02X XXX XXXX)',
  },
  US: {
    id: 'US',
    mobileHint: '(555) 123-4567',
    invalidMobileMessage: 'Enter a valid US mobile number',
  },
};

export function resolveRegion(raw) {
  const key = String(raw || 'AU').trim().toUpperCase();
  return REGIONS[key] || REGIONS.AU;
}

export function campaignRegion(campaign) {
  return resolveRegion(campaign?.config?.region || campaign?.region);
}

export function normaliseMobileForRegion(raw, regionId) {
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

  if (/^\+1\d{10}$/.test(s)) return s;
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return `+${d}`;
  if (d.length === 10) return `+1${d}`;
  return s.startsWith('+') ? s : (d ? `+${d}` : s);
}

export function isValidMobileForRegion(normalised, regionId) {
  const region = resolveRegion(regionId);
  if (region.id === 'AU') return /^04\d{8}$/.test(normalised);
  if (region.id === 'NZ') return /^02\d{7,9}$/.test(normalised);
  if (region.id === 'US') return /^\+1\d{10}$/.test(normalised);
  return false;
}
