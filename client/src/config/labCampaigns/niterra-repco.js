/** Lab config — Niterra / Repco (phone entry, same Lab shell as Ford Display Lab) */

import {
  DEFAULT_CUSTOMER_MESSAGES,
  DEFAULT_QUALIFYING_RULES,
  PHONE_ENTRY_JOURNEY_STAGES,
  PHONE_ENTRY_TURNSTYLE_COMPONENTS,
} from './defaults';

const NITERRA_PHONE_JOURNEY = PHONE_ENTRY_JOURNEY_STAGES.map((s) => {
  if (s.id === 'purchase_validated') {
    return { ...s, hint: 'Brand and spend entered on phone' };
  }
  return s;
});

const NITERRA_TURNSTYLE = PHONE_ENTRY_TURNSTYLE_COMPONENTS.map((c) => (
  c.id === 'purchase'
    ? { ...c, description: 'Self-declared brand & purchase amount' }
    : c
));

export default {
  configId: 'niterra-repco',
  campaignId: 'niterra-ngk-2026',
  campaignName: 'Niterra Instant Win',
  brand: 'NGK / NTK / KYB',
  retailer: 'Repco',
  deviceCode: 'PR-DEMO-001',
  phoneEntryPath: '/enter/repco',
  accessPointType: 'puk',
  accessPointId: 'PUK-NITERRA-LAB',
  accessPoint: {
    qrId: 'PUK-NITERRA-LAB',
    storeId: '247',
    location: 'Repco Waurn Ponds',
  },
  qualifyingPurchase: 'Purchase eligible NGK, NTK or KYB products from Repco',
  eligibleBrands: ['NGK', 'NTK', 'KYB'],
  minSpendHint: 'Eligible product purchase required',
  qualifyingPurchaseRules: {
    ...DEFAULT_QUALIFYING_RULES,
    defaultMinSpend: 50,
    defaultAllowDuplicateReceipts: true,
    showDuplicateReceipts: true,
  },
  embedCustomerPhone: true,
  branding: {
    accentColor: '#e86600',
    accentAlt: '#00c8ff',
    logoUrl: '/logos/purerandom.svg',
    heroImageUrl: '/campaigns/niterra/scan.jpg',
  },
  customerMessages: {
    ...DEFAULT_CUSTOMER_MESSAGES,
    welcome: 'Scan the PUK to enter Niterra Instant Win',
    receipt: 'Enter your purchase details on phone',
    outcomeWin: 'Congratulations — you won an instant prize!',
    outcomeNoWin: 'Thanks for playing — weekly draw entry confirmed',
  },
  prizePresentation: {
    tier1: 'Instant prize (e.g. cap or voucher)',
    tier2: 'Instant prize (e.g. cap or voucher)',
    tier3: 'Instant prize (e.g. cap or voucher)',
    noWin: 'Weekly prize draw entry',
  },
  journeyStages: NITERRA_PHONE_JOURNEY,
  turnstyleComponents: NITERRA_TURNSTYLE,
};
