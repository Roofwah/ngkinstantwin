/** Lab config example #1 — Niterra / Repco / static QR */

import {
  DEFAULT_CUSTOMER_MESSAGES,
  DEFAULT_QUALIFYING_RULES,
  STANDARD_JOURNEY_STAGES,
  STANDARD_TURNSTYLE_COMPONENTS,
} from './defaults';

export default {
  configId: 'niterra-repco',
  campaignId: 'niterra-ngk-2026',
  campaignName: 'Niterra Instant Win',
  brand: 'NGK / NTK / KYB',
  retailer: 'Repco',
  deviceCode: 'PR-DEMO-001',
  accessPointType: 'static-qr',
  accessPointId: 'QR-REPCO-247',
  accessPoint: {
    qrId: 'QR-REPCO-247',
    storeId: '247',
    location: 'Repco Waurn Ponds',
  },
  qualifyingPurchase: 'Purchase eligible NGK, NTK or KYB products from Repco',
  eligibleBrands: ['NGK', 'NTK', 'KYB'],
  minSpendHint: 'Eligible product purchase required',
  qualifyingPurchaseRules: {
    ...DEFAULT_QUALIFYING_RULES,
    defaultAllowDuplicateReceipts: true,
  },
  branding: {
    accentColor: '#e86600',
    accentAlt: '#00c8ff',
    logoUrl: '/logos/purerandom.svg',
    heroImageUrl: '/instant-win/hero.png',
  },
  customerMessages: {
    ...DEFAULT_CUSTOMER_MESSAGES,
    welcome: 'Scan to enter the Niterra Instant Win promotion',
    receipt: 'Upload your Repco receipt',
  },
  prizePresentation: {
    tier1: 'Tier 1 instant prize',
    tier2: 'Tier 2 provisional prize',
    tier3: 'Tier 3 premium prize',
    noWin: 'Weekly draw entry',
  },
  journeyStages: STANDARD_JOURNEY_STAGES,
  turnstyleComponents: STANDARD_TURNSTYLE_COMPONENTS,
};
