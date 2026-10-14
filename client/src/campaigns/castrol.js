export const CASTROL_CAMPAIGN_ID = 'castrol-2026';

export const CASTROL_ENTER_PATH = '/enter/castrol';

export const CASTROL_VERIFICATION_METHOD = 'castrol_instant_win';

export const CASTROL_GREEN = '#00a84a';

export const CASTROL_FORM_ART = '/campaigns/castrol/bg.jpg';

export const CASTROL_LANDING_ART = '/campaigns/castrol/bg.jpg';

export const CASTROL_PRODUCTS = [
  'Castrol EDGE',
  'Castrol GTX',
  'Castrol Magnatec',
];

export const CASTROL_DEFAULT_STORE = 'Castrol Instant Win';

export function castrolLandingArt(campaign) {
  return campaign?.config?.landingHeroUrl || CASTROL_LANDING_ART;
}

export function castrolStoreName(campaign) {
  return campaign?.config?.defaultStoreName || CASTROL_DEFAULT_STORE;
}

export function castrolProducts(campaign) {
  const fromConfig = campaign?.config?.eligibleBrands;
  if (Array.isArray(fromConfig) && fromConfig.length > 0) return fromConfig;
  return CASTROL_PRODUCTS;
}

export function isCastrolWin(result) {
  return Boolean(result) && result !== 'NOT_WINNER';
}

export function isValidCastrolReceiptTail(value) {
  return /^\d{4}$/.test(String(value || '').trim());
}
