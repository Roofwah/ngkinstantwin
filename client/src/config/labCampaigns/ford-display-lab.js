/** Lab config — Ford Display Lab / PUK access point */

import {
  DEFAULT_CUSTOMER_MESSAGES,
  DEFAULT_QUALIFYING_RULES,
  PHONE_ENTRY_JOURNEY_STAGES,
  PHONE_ENTRY_TURNSTYLE_COMPONENTS,
} from './defaults';

export default {
  configId: 'ford-display-lab',
  campaignId: 'ford-2026',
  campaignName: 'Ford Display Lab',
  brand: 'Ford',
  retailer: 'Ford Display Lab',
  deviceCode: 'PR-PUK2-001',
  accessPointType: 'puk',
  accessPointId: 'PUK-FORD-LAB',
  accessPoint: {
    qrId: 'PUK-FORD-LAB',
    storeId: 'ford-display-lab',
    location: 'Ford Display Lab',
  },
  qualifyingPurchase: 'Qualifying Ford vehicle purchase at participating dealers',
  eligibleBrands: ['Ranger', 'Everest', 'Mustang', 'Bronco', 'Territory', 'F-150'],
  minSpendHint: 'Vehicle purchase required',
  qualifyingPurchaseRules: {
    ...DEFAULT_QUALIFYING_RULES,
    defaultAllowDuplicateReceipts: true,
    showDuplicateReceipts: true,
  },
  embedCustomerPhone: true,
  branding: {
    accentColor: '#003478',
    accentAlt: '#102b4e',
    logoUrl: '/campaigns/ford/ford-logo.svg',
    heroImageUrl: '/campaigns/ford/landing.jpg',
  },
  customerMessages: {
    ...DEFAULT_CUSTOMER_MESSAGES,
    welcome: 'Scan the PUK to enter Ford Instant Win',
    receipt: 'Enter your vehicle and sales contract digits on phone',
    outcomeWin: 'Congratulations — you won a Ford service voucher!',
    outcomeNoWin: 'Thanks for playing — check your sweepstakes entry',
  },
  prizePresentation: {
    tier1: 'Ford service or accessories voucher',
    tier2: 'Ford service or accessories voucher',
    tier3: 'Ford service or accessories voucher',
    noWin: 'Sweepstakes prize draw entry',
  },
  journeyStages: PHONE_ENTRY_JOURNEY_STAGES,
  turnstyleComponents: PHONE_ENTRY_TURNSTYLE_COMPONENTS,
};
