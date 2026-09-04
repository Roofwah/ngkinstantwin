export const NITERRA_CAMPAIGN_ID = 'niterra-ngk-2026';

export const NITERRA_BRANDS = ['NGK', 'NTK', 'KYB'];

export const NITERRA_DEFAULT_STORE = 'Repco Waurn Ponds';

export const NITERRA_PRIZE_IMAGES = {
  'NGK Racing Cap': '/campaigns/niterra/cap.png',
  'KYB Workshop Cap': '/campaigns/niterra/cap.png',
};

export function niterraPrizeImage(prizeName) {
  if (!prizeName) return null;
  if (NITERRA_PRIZE_IMAGES[prizeName]) return NITERRA_PRIZE_IMAGES[prizeName];
  const key = String(prizeName).toLowerCase();
  if (key.includes('cap')) return NITERRA_PRIZE_IMAGES['NGK Racing Cap'];
  return null;
}

export function isNiterraWin(result) {
  return Boolean(result) && result !== 'NOT_WINNER';
}
