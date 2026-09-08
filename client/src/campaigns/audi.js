export const AUDI_CAMPAIGN_ID = 'audi-2026';

/** Canonical phone entry URL path for Audi Instant Win (not crossword / receipt flows). */
export const AUDI_ENTER_PATH = '/enter/audi-instant-win';

export const AUDI_VERIFICATION_METHOD = 'audi_instant_win';

export const AUDI_MODELS = [
  'A3', 'A4', 'A5', 'A6',
  'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9',
];

export const AUDI_DEFAULT_DEALER = 'Audi Centre Zetland';

export const AUDI_DEFAULT_LOCATION = 'Zetland NSW';

export function audiDealerName(campaign) {
  return campaign?.config?.defaultStoreName || AUDI_DEFAULT_DEALER;
}

export function audiDealerLocation(campaign) {
  return campaign?.config?.defaultStoreLocation || AUDI_DEFAULT_LOCATION;
}

export function audiModels(campaign) {
  const fromConfig = campaign?.config?.eligibleBrands;
  if (Array.isArray(fromConfig) && fromConfig.length > 0) return fromConfig;
  return AUDI_MODELS;
}

export const AUDI_VOUCHER_NAME = 'Audi service or accessories voucher';
export const AUDI_VOUCHER_MIN = 500;
export const AUDI_VOUCHER_MAX = 800;

export const AUDI_IDLE_VIDEO = '/campaigns/audi/audi.mp4';

export const AUDI_FORM_ART = '/campaigns/audi/iwbg.png';

export function isAudiWin(result) {
  return Boolean(result) && result !== 'NOT_WINNER';
}

export function audiPrizeImage(prizeName) {
  if (!prizeName) return null;
  return '/campaigns/audi/prize.png';
}

export function isValidAudiContractNumber(value) {
  return /^\d{4}$/.test(String(value || '').trim());
}
