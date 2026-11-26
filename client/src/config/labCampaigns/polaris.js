/** Lab config — Polaris Instant Win / AGPower Lilydale */

import {
  DEFAULT_CUSTOMER_MESSAGES,
  DEFAULT_QUALIFYING_RULES,
  PHONE_ENTRY_JOURNEY_STAGES,
  PHONE_ENTRY_TURNSTYLE_COMPONENTS,
} from './defaults';

export default {
  configId: 'polaris',
  campaignId: 'polaris-2026',
  campaignName: 'Polaris Instant Win',
  brand: 'Polaris',
  retailer: 'AGPower',
  deviceCode: 'PR-PUK2-001',
  phoneEntryPath: '/enter/polaris',
  accessPointType: 'puk',
  accessPointId: 'PUK-POLARIS-LAB',
  accessPoint: {
    qrId: 'PUK-POLARIS-LAB',
    storeId: 'agpower-lilydale',
    location: 'AGPower Lilydale',
  },
  qualifyingPurchase: 'Qualifying Polaris purchase at AGPower Lilydale',
  eligibleBrands: [
    'Ranger 500',
    'Ranger SP 570 HD',
    'General XP 1000 Sport',
    'Ranger 1000 Premium',
    'Ranger XP 1000HD',
    'Ranger Diesel HD',
    'Ranger XP 1000 Northstar',
    'General XP 4 1000',
  ],
  minSpendHint: 'Vehicle purchase required',
  qualifyingPurchaseRules: {
    ...DEFAULT_QUALIFYING_RULES,
    defaultAllowDuplicateReceipts: true,
    showDuplicateReceipts: true,
  },
  embedCustomerPhone: true,
  branding: {
    accentColor: '#2842c2',
    accentAlt: '#1a2f7a',
    logoUrl: '/campaigns/polaris/bg.jpg',
    heroImageUrl: '/campaigns/polaris/bg.jpg',
  },
  customerMessages: {
    ...DEFAULT_CUSTOMER_MESSAGES,
    welcome: 'Scan the PUK to enter Polaris Instant Win',
    receipt: 'Enter your model and last 4 invoice digits on phone',
    outcomeWin: 'Congratulations — you won Polaris cashback!',
    outcomeNoWin: 'Thanks for playing',
  },
  prizePresentation: {
    tier1: 'Polaris cashback (up to $1000)',
    tier2: 'Polaris cashback (up to $1000)',
    tier3: 'Polaris cashback (up to $1000)',
    noWin: 'Thanks for playing',
  },
  journeyStages: PHONE_ENTRY_JOURNEY_STAGES,
  turnstyleComponents: PHONE_ENTRY_TURNSTYLE_COMPONENTS,
};
