const HANKOOK_CAMPAIGN_ID = 'hankook-2026';
const HANKOOK_VERIFICATION_METHOD = 'hankook_instant_win';

function isHankookVerificationMethod(method) {
  return method === HANKOOK_VERIFICATION_METHOD;
}

function hankookStoreName(campaign, deviceRow) {
  return deviceRow?.storeName || campaign?.config?.defaultStoreName || 'Hankook Demo';
}

function normaliseReceiptTail(raw) {
  return String(raw || '').trim();
}

function validateHankookEntryPayload(body, campaign, deviceRow, allowedLines) {
  const errors = [];
  const invoiceNumber = normaliseReceiptTail(body.invoiceNumber || body.contractNumber);

  if (!/^\d{4}$/.test(invoiceNumber)) {
    errors.push('Enter the last 4 digits of your receipt or invoice number');
  }

  if (!body.selectedBrand) {
    errors.push('Select the Hankook tyre line you purchased');
  } else if (allowedLines?.length && !allowedLines.includes(body.selectedBrand)) {
    errors.push('Invalid tyre line for this campaign');
  }

  const today = new Date().toISOString().slice(0, 10);
  const storeCode = deviceRow?.storeCode || campaign?.config?.defaultStoreCode || 'hankook-demo';

  return {
    errors,
    invoiceNumber,
    purchaseDate: today,
    purchaseTime: null,
    storeCode,
    storeName: hankookStoreName(campaign, deviceRow),
    productDescription: body.selectedBrand || null,
    selectedBrand: body.selectedBrand,
    spendAmount: 0,
    receiptSource: 'manual',
    verificationMethod: HANKOOK_VERIFICATION_METHOD,
    receiptValidationStatus: 'not_required',
  };
}

module.exports = {
  HANKOOK_CAMPAIGN_ID,
  HANKOOK_VERIFICATION_METHOD,
  isHankookVerificationMethod,
  validateHankookEntryPayload,
};
