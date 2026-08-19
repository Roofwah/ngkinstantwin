export const HOKA_CAMPAIGN_ID = 'hoka-2026';

export const HOKA_ITEMS = [
  'HOKA Footwear',
  'HOKA Apparel',
  'HOKA Accessories',
];

export function isHokaCampaign(campaign) {
  if (!campaign) return false;
  return campaign.id === HOKA_CAMPAIGN_ID || campaign.config?.entryVariant === 'hoka-cotswold';
}

export function isHokaWin(result) {
  return Boolean(result) && result !== 'NOT_WINNER';
}

export const HOKA_PRIZE_IMAGES = {
  'HOKA Crew Socks': '/campaigns/hoka/socks.png',
  'HOKA Run Cap': '/campaigns/hoka/cap.png',
  'HOKA Run Belt': '/campaigns/hoka/belt.png',
  'HOKA Race Sleeves': '/campaigns/hoka/sleeves.png',
  '$50 Cotswold Outdoor Voucher': '/campaigns/hoka/gift.png',
};

export function hokaPrizeImage(prizeName) {
  if (!prizeName) return null;
  if (HOKA_PRIZE_IMAGES[prizeName]) return HOKA_PRIZE_IMAGES[prizeName];
  const key = String(prizeName).toLowerCase();
  if (key.includes('sock')) return HOKA_PRIZE_IMAGES['HOKA Crew Socks'];
  if (key.includes('cap') || key.includes('hat')) return HOKA_PRIZE_IMAGES['HOKA Run Cap'];
  if (key.includes('belt')) return HOKA_PRIZE_IMAGES['HOKA Run Belt'];
  if (key.includes('sleeve')) return HOKA_PRIZE_IMAGES['HOKA Race Sleeves'];
  if (key.includes('voucher') || key.includes('gift')) return HOKA_PRIZE_IMAGES['$50 Cotswold Outdoor Voucher'];
  return null;
}
