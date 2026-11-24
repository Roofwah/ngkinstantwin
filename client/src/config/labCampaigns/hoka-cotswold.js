/** Lab config — HOKA / Cotswold Outdoor / PUK access point */

import {
  DEFAULT_CUSTOMER_MESSAGES,
  DEFAULT_QUALIFYING_RULES,
  HOKA_JOURNEY_STAGES,
  HOKA_TURNSTYLE_COMPONENTS,
} from './defaults';

export default {
  configId: 'hoka-cotswold',
  campaignId: 'hoka-2026',
  campaignName: 'HOKA Instant Win',
  brand: 'HOKA',
  retailer: 'Cotswold Outdoor',
  deviceCode: 'PR-PUK2-001',
  accessPointType: 'puk',
  accessPointId: 'PUK-COTSWOLD-BHM',
  accessPoint: {
    qrId: 'PUK-COTSWOLD-BHM',
    storeId: 'cotswold-birmingham',
    location: 'Cotswold Outdoor Birmingham',
  },
  qualifyingPurchase: 'Spend $50 or more on qualifying HOKA products in one transaction',
  eligibleBrands: ['HOKA Footwear', 'HOKA Apparel', 'HOKA Accessories'],
  minSpendHint: 'Minimum spend $50 on HOKA',
  qualifyingPurchaseRules: {
    ...DEFAULT_QUALIFYING_RULES,
    minSpendOptions: [50, 75, 100, 150, 200],
    defaultMinSpend: 50,
    defaultAllowDuplicateReceipts: false,
    showDuplicateReceipts: false,
  },
  embedCustomerPhone: true,
  branding: {
    accentColor: '#dfff00',
    accentAlt: '#111111',
    logoUrl: '/campaigns/hoka/slide1.jpg',
    heroImageUrl: '/campaigns/hoka/slide1.jpg',
  },
  customerMessages: {
    ...DEFAULT_CUSTOMER_MESSAGES,
    welcome: 'Scan the PUK to enter — Win your HOKA purchase back',
    receipt: 'Enter your purchase details on phone',
    outcomeWin: 'Congratulations — you have an instant HOKA prize!',
    outcomeNoWin: "Thanks for playing — you've been entered into the sweepstakes draw",
  },
  prizePresentation: {
    tier1: 'HOKA Crew Socks',
    tier2: 'HOKA Run Cap',
    tier3: 'HOKA Run Belt',
    noWin: 'Sweepstakes prize draw entry',
  },
  journeyStages: HOKA_JOURNEY_STAGES,
  turnstyleComponents: HOKA_TURNSTYLE_COMPONENTS,
};
