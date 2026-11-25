const LOVES_CAMPAIGN_ID = 'loves-2026';
const LOVES_VERIFICATION_METHOD = 'loves_instant_win';
const LOVES_DEFAULT_BRAND = 'Loves';
const LOVES_DEFAULT_STORE = 'Loves Travel Stop Rock Falls IL';
const LOVES_DEFAULT_STORE_CODE = 'loves-rock-falls';

/** Demo prizes — merch pool (Guinness shape). */
const LOVES_DEFAULT_PRIZES = [
  { name: 'Cooler', value: 10, qty: 40, image: '/campaigns/loves/cooler.png' },
  { name: 'Cap', value: 25, qty: 40, image: '/campaigns/loves/cap.png' },
  { name: 'Car', value: 60, qty: 4, image: '/campaigns/loves/car.png' },
  { name: 'Card', value: 50, qty: 40, image: '/campaigns/loves/card.png' },
  { name: 'Powerbank', value: 40, qty: 40, image: '/campaigns/loves/powerbank.png' },
  { name: 'Sunglasses', value: 35, qty: 40, image: '/campaigns/loves/sunglasses.png' },
];

function lovesDemoPrizes() {
  return LOVES_DEFAULT_PRIZES.map((p) => ({ ...p }));
}

function isLovesVerificationMethod(method) {
  return method === LOVES_VERIFICATION_METHOD;
}

function lovesStoreName(campaign, deviceRow) {
  // Venue is campaign-owned — do not inherit Cotswold/other device labels
  return campaign?.config?.defaultStoreName || LOVES_DEFAULT_STORE || deviceRow?.storeName;
}

/**
 * Loves Travel Stop — name + mobile only (Guinness shape).
 * No receipt digits or product picker; brand/receipt filled server-side.
 */
function validateLovesEntryPayload(body, campaign, deviceRow) {
  const errors = [];
  const today = new Date().toISOString().slice(0, 10);
  const storeCode = deviceRow?.storeCode || campaign?.config?.defaultStoreCode || LOVES_DEFAULT_STORE_CODE;
  const brand = LOVES_DEFAULT_BRAND;
  const invoiceNumber = `LVS-${Date.now().toString(36).toUpperCase()}`;

  return {
    errors,
    invoiceNumber,
    purchaseDate: today,
    purchaseTime: null,
    storeCode,
    storeName: lovesStoreName(campaign, deviceRow),
    productDescription: brand,
    selectedBrand: brand,
    spendAmount: 0,
    receiptSource: 'not_required',
    verificationMethod: LOVES_VERIFICATION_METHOD,
    receiptValidationStatus: 'not_required',
  };
}

module.exports = {
  LOVES_CAMPAIGN_ID,
  LOVES_VERIFICATION_METHOD,
  LOVES_DEFAULT_PRIZES,
  LOVES_DEFAULT_BRAND,
  LOVES_DEFAULT_STORE,
  lovesDemoPrizes,
  isLovesVerificationMethod,
  validateLovesEntryPayload,
};
