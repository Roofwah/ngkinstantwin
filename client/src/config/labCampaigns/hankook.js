/** Lab config — Hankook Instant Win / PUK access point */

import {
  DEFAULT_CUSTOMER_MESSAGES,
  DEFAULT_QUALIFYING_RULES,
  PHONE_ENTRY_JOURNEY_STAGES,
  PHONE_ENTRY_TURNSTYLE_COMPONENTS,
} from './defaults';

export default {
  configId: 'hankook',
  campaignId: 'hankook-2026',
  campaignName: 'Hankook Instant Win',
  brand: 'Hankook',
  retailer: 'Hankook',
  deviceCode: 'PR-PUK2-001',
  phoneEntryPath: '/enter/hankook',
  accessPointType: 'puk',
  accessPointId: 'PUK-HANKOOK-LAB',
  accessPoint: {
    qrId: 'PUK-HANKOOK-LAB',
    storeId: 'hankook-demo',
    location: 'Hankook Demo',
  },
  qualifyingPurchase: 'Buy 4 Hankook tires to qualify',
  eligibleBrands: ['iON', 'Ventus', 'Dynapro', 'Weatherflex', 'Kinergy'],
  minSpendHint: '4 tires required',
  qualifyingPurchaseRules: {
    ...DEFAULT_QUALIFYING_RULES,
    defaultAllowDuplicateReceipts: true,
    showDuplicateReceipts: true,
  },
  embedCustomerPhone: true,
  branding: {
    accentColor: '#db5200',
    accentAlt: '#8a3400',
    logoUrl: '/campaigns/hankook/bg.jpg',
    heroImageUrl: '/campaigns/hankook/bg.jpg',
  },
  customerMessages: {
    ...DEFAULT_CUSTOMER_MESSAGES,
    welcome: 'Scan the PUK to enter Hankook Instant Win — Driving Emotion',
    receipt: 'Select your Hankook tire line and complete entry on phone',
    outcomeWin: 'Congratulations — you won $200 cashback!',
    outcomeNoWin: 'Thanks for playing',
  },
  prizePresentation: {
    tier1: '$200 Cashback',
    tier2: '$200 Cashback',
    tier3: '$200 Cashback',
    noWin: 'Thanks for playing',
  },
  journeyStages: PHONE_ENTRY_JOURNEY_STAGES,
  turnstyleComponents: PHONE_ENTRY_TURNSTYLE_COMPONENTS,
};
