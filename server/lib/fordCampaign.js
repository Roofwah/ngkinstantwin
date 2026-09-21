const FORD_CAMPAIGN_ID = 'ford-2026';
const FORD_VERIFICATION_METHOD = 'ford_display_lab';

function isFordVerificationMethod(method) {
  return method === FORD_VERIFICATION_METHOD;
}

function fordStoreName(campaign, deviceRow) {
  return deviceRow?.storeName || campaign?.config?.defaultStoreName || 'Ford Display Lab';
}

function validateFordEntryPayload(body, campaign, deviceRow, allowedVehicles) {
  const errors = [];
  const invoiceNumber = String(body.invoiceNumber || body.contractNumber || '').replace(/\D/g, '');

  if (!/^\d{10}$/.test(invoiceNumber)) {
    errors.push('Invoice number must be exactly 10 digits');
  }

  if (!body.selectedBrand) {
    errors.push('Purchased Vehicle is required');
  } else if (allowedVehicles?.length && !allowedVehicles.includes(body.selectedBrand)) {
    errors.push('Invalid vehicle for this campaign');
  }

  const today = new Date().toISOString().slice(0, 10);
  const storeCode = invoiceNumber.length >= 3 ? invoiceNumber.slice(0, 3) : (deviceRow?.storeCode || 'FRD');

  return {
    errors,
    invoiceNumber,
    purchaseDate: today,
    purchaseTime: null,
    storeCode,
    storeName: fordStoreName(campaign, deviceRow),
    productDescription: body.selectedBrand || null,
    selectedBrand: body.selectedBrand,
    spendAmount: 0,
    receiptSource: 'manual',
    verificationMethod: FORD_VERIFICATION_METHOD,
    receiptValidationStatus: 'not_required',
  };
}

module.exports = {
  FORD_CAMPAIGN_ID,
  FORD_VERIFICATION_METHOD,
  isFordVerificationMethod,
  validateFordEntryPayload,
};
