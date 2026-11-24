export const GUINNESS_CAMPAIGN_ID = 'guinness-2026';

export const GUINNESS_ENTER_PATH = '/enter/guinness';

export const GUINNESS_VERIFICATION_METHOD = 'guinness_instant_win';

export const GUINNESS_GOLD = '#cba135';

export const GUINNESS_FORM_ART = '/campaigns/guinness/bg.jpg';

export const GUINNESS_LANDING_ART = '/campaigns/guinness/bg.jpg';

export const GUINNESS_DEFAULT_STORE = 'Shamrock Arms';

export const GUINNESS_DEFAULT_BRAND = 'Guinness';

export function guinnessLandingArt(campaign) {
  return campaign?.config?.landingHeroUrl
    || campaign?.config?.formArtUrl
    || campaign?.config?.heroImageUrl
    || GUINNESS_LANDING_ART;
}

export function guinnessStoreName(campaign) {
  return campaign?.config?.defaultStoreName || GUINNESS_DEFAULT_STORE;
}

export function isGuinnessWin(result) {
  return Boolean(result) && result !== 'NOT_WINNER';
}

export const GUINNESS_PRIZE_IMAGES = {
  'Guinness Bag': '/campaigns/guinness/bag.png',
  'Guinness Beanie': '/campaigns/guinness/beanie.png',
  'Guinness Cap': '/campaigns/guinness/cap.png',
  'Guinness Scarf': '/campaigns/guinness/scarf.png',
  'Guinness Umbrella': '/campaigns/guinness/umbrella.png',
};

export function guinnessPrizeImage(prizeName) {
  if (!prizeName) return null;
  if (GUINNESS_PRIZE_IMAGES[prizeName]) return GUINNESS_PRIZE_IMAGES[prizeName];
  const key = String(prizeName).toLowerCase();
  if (key.includes('bag')) return GUINNESS_PRIZE_IMAGES['Guinness Bag'];
  if (key.includes('beanie')) return GUINNESS_PRIZE_IMAGES['Guinness Beanie'];
  if (key.includes('cap')) return GUINNESS_PRIZE_IMAGES['Guinness Cap'];
  if (key.includes('scarf')) return GUINNESS_PRIZE_IMAGES['Guinness Scarf'];
  if (key.includes('umbrella')) return GUINNESS_PRIZE_IMAGES['Guinness Umbrella'];
  return null;
}
