const SMIRNOFF_CAMPAIGN_ID = 'smirnoff-2026';
const SMIRNOFF_VERIFICATION_METHOD = 'smirnoff_instant_win';
const SMIRNOFF_STORE_NAME = 'Thirsty Camel Coolum';

const SMIRNOFF_DEFAULT_PRIZES = [
  { name: 'Smirnoff Limited Edition Cap', value: 35, qty: 48 },
];

function smirnoffDemoPrizes() {
  return SMIRNOFF_DEFAULT_PRIZES.map((prize) => ({ ...prize }));
}

function isSmirnoffVerificationMethod(method) {
  return method === SMIRNOFF_VERIFICATION_METHOD;
}

function smirnoffStoreName(campaign, deviceRow) {
  return campaign?.config?.defaultStoreName
    || deviceRow?.storeName
    || SMIRNOFF_STORE_NAME;
}

function validateSmirnoffEntryPayload(body, campaign, deviceRow, allowedProducts) {
  const errors = [];

  if (!body.selectedBrand) {
    errors.push('Select the Smirnoff product you purchased');
  } else if (allowedProducts?.length && !allowedProducts.includes(body.selectedBrand)) {
    errors.push('Invalid product for this campaign');
  }

  const today = new Date().toISOString().slice(0, 10);
  const invoiceNumber = `SMIR${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;

  return {
    errors,
    invoiceNumber,
    purchaseDate: today,
    purchaseTime: null,
    storeCode: deviceRow?.storeCode || campaign?.config?.defaultStoreCode || 'thirsty-camel-coolum',
    storeName: smirnoffStoreName(campaign, deviceRow),
    productDescription: body.selectedBrand || null,
    selectedBrand: body.selectedBrand,
    spendAmount: 0,
    receiptSource: 'manual',
    verificationMethod: SMIRNOFF_VERIFICATION_METHOD,
    receiptValidationStatus: 'not_required',
  };
}

module.exports = {
  SMIRNOFF_CAMPAIGN_ID,
  SMIRNOFF_VERIFICATION_METHOD,
  SMIRNOFF_STORE_NAME,
  smirnoffDemoPrizes,
  isSmirnoffVerificationMethod,
  validateSmirnoffEntryPayload,
};
