export const POLARIS_CAMPAIGN_ID = 'polaris-2026';

export const POLARIS_ENTER_PATH = '/enter/polaris';

export const POLARIS_VERIFICATION_METHOD = 'polaris_agpower';

export const POLARIS_BLUE = '#2842c2';

export const POLARIS_FORM_ART = '/campaigns/polaris/bg.jpg';

export const POLARIS_LANDING_ART = '/campaigns/polaris/bg.jpg';

export const POLARIS_QR_BG = '/campaigns/polaris/bg.jpg';

export function polarisLandingArt(campaign) {
  return campaign?.config?.landingHeroUrl || POLARIS_LANDING_ART;
}

export const POLARIS_MODELS = [
  'Ranger 500',
  'Ranger SP 570 HD',
  'General XP 1000 Sport',
  'Ranger 1000 Premium',
  'Ranger XP 1000HD',
  'Ranger Diesel HD',
  'Ranger XP 1000 Northstar',
  'General XP 4 1000',
];

export const POLARIS_DEFAULT_DEALER = 'AGPower Lilydale';

export const POLARIS_CASHBACK_NAME = 'Cashback';
export const POLARIS_CASHBACK_MIN = 100;
export const POLARIS_CASHBACK_MAX = 1000;
export const POLARIS_CASHBACK_STEP = 50;

/** @deprecated */
export const POLARIS_CASH_NAME = POLARIS_CASHBACK_NAME;
/** @deprecated */
export const POLARIS_CASH_VALUE = POLARIS_CASHBACK_MAX;

export function polarisDealerName(campaign) {
  return campaign?.config?.defaultStoreName || POLARIS_DEFAULT_DEALER;
}

export function polarisModels(campaign) {
  const fromConfig = campaign?.config?.eligibleBrands;
  if (Array.isArray(fromConfig) && fromConfig.length > 0) return fromConfig;
  return POLARIS_MODELS;
}

export function isPolarisWin(result) {
  return Boolean(result) && result !== 'NOT_WINNER';
}

export function isValidPolarisInvoiceTail(value) {
  return /^\d{4}$/.test(String(value || '').trim());
}

export function polarisPrizeLabel(prizeName, prizeValue) {
  const name = prizeName || POLARIS_CASHBACK_NAME;
  const value = Number(prizeValue);
  if (!Number.isFinite(value) || value <= 0) return name;
  if (/^\$\d/.test(String(name))) return name;
  return `$${value} ${name}`;
}
