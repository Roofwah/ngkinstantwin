/** Lab config — Taco Bell Instant Win (US) */

import {
  DEFAULT_CUSTOMER_MESSAGES,
  DEFAULT_QUALIFYING_RULES,
  PHONE_ENTRY_JOURNEY_STAGES,
  PHONE_ENTRY_TURNSTYLE_COMPONENTS,
} from './defaults';

export default {
  configId: 'taco-bell',
  campaignId: 'taco-bell-2026',
  campaignName: 'Taco Bell Instant Win',
  brand: 'Taco Bell',
  retailer: 'Taco Bell',
  region: 'US',
  deviceCode: 'PR-DEMO-001',
  phoneEntryPath: '/enter/taco-bell',
  accessPointType: 'puk',
  accessPointId: 'PUK-TACO-BELL-LAB',
  accessPoint: {
    qrId: 'PUK-TACO-BELL-LAB',
    storeId: 'taco-bell-demo',
    location: 'Taco Bell Demo · US',
  },
  qualifyingPurchase: 'Buy a participating Taco Bell menu item',
  eligibleBrands: [
    'Crunchwrap Supreme',
    'Doritos Locos Tacos',
    'Burrito',
    'Quesadilla',
    'Nachos',
  ],
  minSpendHint: 'Participating menu item',
  qualifyingPurchaseRules: {
    ...DEFAULT_QUALIFYING_RULES,
    defaultAllowDuplicateReceipts: true,
    showDuplicateReceipts: true,
  },
  embedCustomerPhone: true,
  branding: {
    accentColor: '#702382',
    accentAlt: '#4a155c',
    logoUrl: '/campaigns/taco-bell/bg.svg',
    heroImageUrl: '/campaigns/taco-bell/bg.svg',
  },
  customerMessages: {
    ...DEFAULT_CUSTOMER_MESSAGES,
    welcome: 'Scan to enter Taco Bell Instant Win — US',
    receipt: 'Select your menu item and verify your US mobile',
    outcomeWin: 'Congratulations — you won!',
    outcomeNoWin: 'Thanks for playing',
  },
  prizePresentation: {
    tier1: 'Free Crunchwrap Supreme',
    tier2: '$5 Taco Bell Credit',
    tier3: 'Free Crunchwrap Supreme',
    noWin: 'Thanks for playing',
  },
  journeyStages: PHONE_ENTRY_JOURNEY_STAGES,
  turnstyleComponents: PHONE_ENTRY_TURNSTYLE_COMPONENTS,
};
