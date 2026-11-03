export const HANKOOK_CAMPAIGN_ID = 'hankook-2026';

export const HANKOOK_ENTER_PATH = '/enter/hankook';

export const HANKOOK_VERIFICATION_METHOD = 'hankook_instant_win';

export const HANKOOK_ORANGE = '#db5200';

export const HANKOOK_FORM_ART = '/campaigns/hankook/bg.jpg';

export const HANKOOK_LANDING_ART = '/campaigns/hankook/bg.jpg';

export const HANKOOK_LINES = [
  'iON',
  'Ventus',
  'Dynapro',
  'Weatherflex',
  'Kinergy',
];

export const HANKOOK_DEFAULT_STORE = 'Hankook Demo';

export function hankookLandingArt(campaign) {
  return campaign?.config?.landingHeroUrl
    || campaign?.config?.formArtUrl
    || campaign?.config?.heroImageUrl
    || HANKOOK_LANDING_ART;
}

export function hankookStoreName(campaign) {
  return campaign?.config?.defaultStoreName || HANKOOK_DEFAULT_STORE;
}

export function hankookLines(campaign) {
  const fromConfig = campaign?.config?.eligibleBrands;
  if (Array.isArray(fromConfig) && fromConfig.length > 0) return fromConfig;
  return HANKOOK_LINES;
}

export function isHankookWin(result) {
  return Boolean(result) && result !== 'NOT_WINNER';
}

export function isValidHankookReceiptTail(value) {
  return /^\d{4}$/.test(String(value || '').trim());
}
