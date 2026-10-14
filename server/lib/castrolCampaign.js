const CASTROL_CAMPAIGN_ID = 'castrol-2026';
const CASTROL_VERIFICATION_METHOD = 'castrol_instant_win';

const CASTROL_DEFAULT_PRIZES = [
  { name: 'Castrol EDGE 5L pack', value: 65, qty: 12 },
  { name: 'Castrol workshop cap', value: 25, qty: 24 },
  { name: '$50 fuel voucher', value: 50, qty: 12 },
];

function castrolDemoPrizes() {
  return CASTROL_DEFAULT_PRIZES.map((p) => ({ ...p }));
}

function isCastrolVerificationMethod(method) {
  return method === CASTROL_VERIFICATION_METHOD;
}

function castrolStoreName(campaign, deviceRow) {
  return deviceRow?.storeName || campaign?.config?.defaultStoreName || 'Castrol Instant Win';
}

function normaliseReceiptTail(raw) {
  return String(raw || '').trim();
}

function validateCastrolEntryPayload(body, campaign, deviceRow, allowedProducts) {
  const errors = [];
  const invoiceNumber = normaliseReceiptTail(body.invoiceNumber || body.contractNumber);

  if (!/^\d{4}$/.test(invoiceNumber)) {
    errors.push('Enter the last 4 digits of your receipt or invoice number');
  }

  if (!body.selectedBrand) {
    errors.push('Select the Castrol product you purchased');
  } else if (allowedProducts?.length && !allowedProducts.includes(body.selectedBrand)) {
    errors.push('Invalid product for this campaign');
  }

  const today = new Date().toISOString().slice(0, 10);
  const storeCode = deviceRow?.storeCode || campaign?.config?.defaultStoreCode || 'castrol-demo';

  return {
    errors,
    invoiceNumber,
    purchaseDate: today,
    purchaseTime: null,
    storeCode,
    storeName: castrolStoreName(campaign, deviceRow),
    productDescription: body.selectedBrand || null,
    selectedBrand: body.selectedBrand,
    spendAmount: 0,
    receiptSource: 'manual',
    verificationMethod: CASTROL_VERIFICATION_METHOD,
    receiptValidationStatus: 'not_required',
  };
}

module.exports = {
  CASTROL_CAMPAIGN_ID,
  CASTROL_VERIFICATION_METHOD,
  castrolDemoPrizes,
  isCastrolVerificationMethod,
  validateCastrolEntryPayload,
};
