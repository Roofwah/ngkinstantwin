const GUINNESS_CAMPAIGN_ID = 'guinness-2026';
const GUINNESS_VERIFICATION_METHOD = 'guinness_instant_win';
const GUINNESS_DEFAULT_BRAND = 'Guinness';
const GUINNESS_DEFAULT_STORE = 'Shamrock Arms';
const GUINNESS_DEFAULT_STORE_CODE = 'shamrock-arms';

/** Demo prizes — merch pool (Niterra / Hoka shape), not cashback. */
const GUINNESS_DEFAULT_PRIZES = [
  { name: 'Guinness Bag', value: 45, qty: 40, image: '/campaigns/guinness/bag.png' },
  { name: 'Guinness Beanie', value: 35, qty: 40, image: '/campaigns/guinness/beanie.png' },
  { name: 'Guinness Cap', value: 35, qty: 40, image: '/campaigns/guinness/cap.png' },
  { name: 'Guinness Scarf', value: 40, qty: 40, image: '/campaigns/guinness/scarf.png' },
  { name: 'Guinness Umbrella', value: 45, qty: 40, image: '/campaigns/guinness/umbrella.png' },
];

function guinnessDemoPrizes() {
  return GUINNESS_DEFAULT_PRIZES.map((p) => ({ ...p }));
}

function isGuinnessVerificationMethod(method) {
  return method === GUINNESS_VERIFICATION_METHOD;
}

function guinnessStoreName(campaign, deviceRow) {
  return deviceRow?.storeName || campaign?.config?.defaultStoreName || GUINNESS_DEFAULT_STORE;
}

/**
 * Shamrock Arms — name + mobile only.
 * No receipt digits or product picker; brand/receipt are filled server-side.
 */
function validateGuinnessEntryPayload(body, campaign, deviceRow) {
  const errors = [];
  const today = new Date().toISOString().slice(0, 10);
  const storeCode = deviceRow?.storeCode || campaign?.config?.defaultStoreCode || GUINNESS_DEFAULT_STORE_CODE;
  const brand = GUINNESS_DEFAULT_BRAND;
  // Unique synthetic receipt so duplicate-invoice checks don't block pub plays
  const invoiceNumber = `SHA-${Date.now().toString(36).toUpperCase()}`;

  return {
    errors,
    invoiceNumber,
    purchaseDate: today,
    purchaseTime: null,
    storeCode,
    storeName: guinnessStoreName(campaign, deviceRow),
    productDescription: brand,
    selectedBrand: brand,
    spendAmount: 0,
    receiptSource: 'not_required',
    verificationMethod: GUINNESS_VERIFICATION_METHOD,
    receiptValidationStatus: 'not_required',
  };
}

module.exports = {
  GUINNESS_CAMPAIGN_ID,
  GUINNESS_VERIFICATION_METHOD,
  GUINNESS_DEFAULT_PRIZES,
  GUINNESS_DEFAULT_BRAND,
  GUINNESS_DEFAULT_STORE,
  guinnessDemoPrizes,
  isGuinnessVerificationMethod,
  validateGuinnessEntryPayload,
};
