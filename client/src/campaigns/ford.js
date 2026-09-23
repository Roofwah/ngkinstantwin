export const FORD_CAMPAIGN_ID = 'ford-2026';

export const FORD_ENTER_PATH = '/enter/ford';

export const FORD_VERIFICATION_METHOD = 'ford_display_lab';

export const FORD_BLUE = '#003478';

export const FORD_FORM_ART = '/campaigns/ford/scan.jpg';

export const FORD_LANDING_ART = '/campaigns/ford/landing.jpg';

export const FORD_QR_BG = '/campaigns/ford/scan.jpg';

export function fordLandingArt(campaign) {
  return campaign?.config?.landingHeroUrl || FORD_LANDING_ART;
}

export const FORD_VEHICLES = [
  'Ranger',
  'Everest',
  'Mustang',
  'Bronco',
  'Territory',
  'F-150',
];

export const FORD_DEFAULT_DEALER = 'Ford Display Lab';

export const FORD_VOUCHER_NAME = 'Ford service or accessories voucher';
export const FORD_VOUCHER_MIN = 500;
export const FORD_VOUCHER_MAX = 800;
export const FORD_VOUCHER_STEP = 50;

export function fordDealerName(campaign) {
  return campaign?.config?.defaultStoreName || FORD_DEFAULT_DEALER;
}

export function fordVehicles(campaign) {
  const fromConfig = campaign?.config?.eligibleBrands;
  if (Array.isArray(fromConfig) && fromConfig.length > 0) return fromConfig;
  return FORD_VEHICLES;
}

export function isFordWin(result) {
  return Boolean(result) && result !== 'NOT_WINNER';
}

export function isValidFordInvoiceNumber(value) {
  return /^\d{10}$/.test(String(value || '').replace(/\D/g, ''));
}

export const FORD_SWEEPSTAKES_MSG =
  "You're not an instant winner this time. You've been automatically entered into the sweepstakes prize draw.";
