export const SMIRNOFF_CAMPAIGN_ID = 'smirnoff-2026';

export const SMIRNOFF_ENTER_PATH = '/enter/smirnoff';

export const SMIRNOFF_VERIFICATION_METHOD = 'smirnoff_instant_win';

export const SMIRNOFF_RED = '#E10600';

export const SMIRNOFF_DEFAULT_STORE = 'Thirsty Camel Coolum';

export const SMIRNOFF_PRODUCTS = ['Smirnoff'];

export function smirnoffStoreName(campaign) {
  return campaign?.config?.defaultStoreName || SMIRNOFF_DEFAULT_STORE;
}

export function smirnoffProducts(campaign) {
  const fromConfig = campaign?.config?.eligibleBrands;
  if (Array.isArray(fromConfig) && fromConfig.length > 0) return fromConfig;
  return SMIRNOFF_PRODUCTS;
}

export function isSmirnoffWin(result) {
  return Boolean(result) && result !== 'NOT_WINNER';
}
