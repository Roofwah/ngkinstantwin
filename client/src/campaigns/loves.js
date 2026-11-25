export const LOVES_CAMPAIGN_ID = 'loves-2026';

export const LOVES_ENTER_PATH = '/enter/loves';

export const LOVES_VERIFICATION_METHOD = 'loves_instant_win';

export const LOVES_RED = '#ed2224';

export const LOVES_REGION = 'US';

export const LOVES_FORM_ART = '/campaigns/loves/bg.jpg';

export const LOVES_LANDING_ART = '/campaigns/loves/bg.jpg';

export const LOVES_DEFAULT_STORE = 'Loves Travel Stop Rock Falls IL';

export const LOVES_DEFAULT_BRAND = 'Loves';

export function lovesLandingArt(campaign) {
  return campaign?.config?.landingHeroUrl
    || campaign?.config?.formArtUrl
    || campaign?.config?.heroImageUrl
    || LOVES_LANDING_ART;
}

export function lovesStoreName(campaign) {
  return campaign?.config?.defaultStoreName || LOVES_DEFAULT_STORE;
}

export function isLovesWin(result) {
  return Boolean(result) && result !== 'NOT_WINNER';
}

export const LOVES_PRIZE_IMAGES = {
  Cooler: '/campaigns/loves/cooler.png',
  Cap: '/campaigns/loves/cap.png',
  Car: '/campaigns/loves/car.png',
  Card: '/campaigns/loves/card.png',
  Powerbank: '/campaigns/loves/powerbank.png',
  Sunglasses: '/campaigns/loves/sunglasses.png',
};

export function lovesPrizeImage(prizeName) {
  if (!prizeName) return null;
  if (LOVES_PRIZE_IMAGES[prizeName]) return LOVES_PRIZE_IMAGES[prizeName];
  const key = String(prizeName).toLowerCase();
  if (key.includes('cooler')) return LOVES_PRIZE_IMAGES.Cooler;
  if (key.includes('cap')) return LOVES_PRIZE_IMAGES.Cap;
  if (key.includes('car')) return LOVES_PRIZE_IMAGES.Car;
  if (key.includes('card')) return LOVES_PRIZE_IMAGES.Card;
  if (key.includes('power')) return LOVES_PRIZE_IMAGES.Powerbank;
  if (key.includes('sunglass')) return LOVES_PRIZE_IMAGES.Sunglasses;
  return null;
}
