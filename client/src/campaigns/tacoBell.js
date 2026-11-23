export const TACO_BELL_CAMPAIGN_ID = 'taco-bell-2026';

export const TACO_BELL_ENTER_PATH = '/enter/taco-bell';

export const TACO_BELL_VERIFICATION_METHOD = 'taco_bell_instant_win';

export const TACO_BELL_PURPLE = '#702382';

export const TACO_BELL_FORM_ART = '/campaigns/taco-bell/bg.svg';

export const TACO_BELL_LANDING_ART = '/campaigns/taco-bell/bg.svg';

export const TACO_BELL_ITEMS = [
  'Crunchwrap Supreme',
  'Doritos Locos Tacos',
  'Burrito',
  'Quesadilla',
  'Nachos',
];

export const TACO_BELL_DEFAULT_STORE = 'Taco Bell Demo';

export const TACO_BELL_REGION = 'US';

export function tacoBellLandingArt(campaign) {
  return campaign?.config?.landingHeroUrl
    || campaign?.config?.formArtUrl
    || TACO_BELL_LANDING_ART;
}

export function tacoBellStoreName(campaign) {
  return campaign?.config?.defaultStoreName || TACO_BELL_DEFAULT_STORE;
}

export function tacoBellItems(campaign) {
  const fromConfig = campaign?.config?.eligibleBrands;
  if (Array.isArray(fromConfig) && fromConfig.length > 0) return fromConfig;
  return TACO_BELL_ITEMS;
}

export function isTacoBellWin(result) {
  return Boolean(result) && result !== 'NOT_WINNER';
}

export function isValidTacoBellReceiptTail(value) {
  return /^\d{4}$/.test(String(value || '').trim());
}
