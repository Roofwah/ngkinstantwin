const TACO_BELL_CAMPAIGN_ID = 'taco-bell-2026';
const TACO_BELL_VERIFICATION_METHOD = 'taco_bell_instant_win';

const TACO_BELL_DEFAULT_PRIZES = [
  { name: 'Free Crunchwrap Supreme', value: 6, qty: 200 },
  { name: '$5 Taco Bell Credit', value: 5, qty: 200 },
];

function tacoBellDemoPrizes() {
  return TACO_BELL_DEFAULT_PRIZES.map((p) => ({ ...p }));
}

function isTacoBellVerificationMethod(method) {
  return method === TACO_BELL_VERIFICATION_METHOD;
}

function tacoBellStoreName(campaign, deviceRow) {
  return deviceRow?.storeName || campaign?.config?.defaultStoreName || 'Taco Bell Demo';
}

function normaliseReceiptTail(raw) {
  return String(raw || '').trim();
}

function validateTacoBellEntryPayload(body, campaign, deviceRow, allowedItems) {
  const errors = [];
  const invoiceNumber = normaliseReceiptTail(body.invoiceNumber || body.contractNumber);

  if (!/^\d{4}$/.test(invoiceNumber)) {
    errors.push('Enter the last 4 digits of your receipt');
  }

  if (!body.selectedBrand) {
    errors.push('Select the menu item you purchased');
  } else if (allowedItems?.length && !allowedItems.includes(body.selectedBrand)) {
    errors.push('Invalid menu item for this campaign');
  }

  const today = new Date().toISOString().slice(0, 10);
  const storeCode = deviceRow?.storeCode || campaign?.config?.defaultStoreCode || 'taco-bell-demo';

  return {
    errors,
    invoiceNumber,
    purchaseDate: today,
    purchaseTime: null,
    storeCode,
    storeName: tacoBellStoreName(campaign, deviceRow),
    productDescription: body.selectedBrand || null,
    selectedBrand: body.selectedBrand,
    spendAmount: 0,
    receiptSource: 'manual',
    verificationMethod: TACO_BELL_VERIFICATION_METHOD,
    receiptValidationStatus: 'not_required',
  };
}

module.exports = {
  TACO_BELL_CAMPAIGN_ID,
  TACO_BELL_VERIFICATION_METHOD,
  tacoBellDemoPrizes,
  isTacoBellVerificationMethod,
  validateTacoBellEntryPayload,
};
