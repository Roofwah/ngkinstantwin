const FORD_CAMPAIGN_ID = 'ford-2026';
const FORD_VERIFICATION_METHOD = 'ford_display_lab';

const FORD_VOUCHER_NAME = 'Ford service or accessories voucher';
const FORD_VOUCHER_MIN = 500;
const FORD_VOUCHER_MAX = 800;
const FORD_VOUCHER_STEP = 50;
const FORD_VOUCHER_VALUES = Array.from(
  { length: (FORD_VOUCHER_MAX - FORD_VOUCHER_MIN) / FORD_VOUCHER_STEP + 1 },
  (_, i) => FORD_VOUCHER_MIN + i * FORD_VOUCHER_STEP,
);

function fordDemoPrizes() {
  return FORD_VOUCHER_VALUES.map((value) => ({
    name: FORD_VOUCHER_NAME,
    value,
    qty: 2,
  }));
}

function fordVoucherDisplayName() {
  return FORD_VOUCHER_NAME;
}

function fordManifestPrizes() {
  return {
    tier1: FORD_VOUCHER_VALUES.flatMap((value) => ([
      { prizeName: FORD_VOUCHER_NAME, value },
      { prizeName: FORD_VOUCHER_NAME, value },
    ])),
    tier2: [],
    tier3: [],
  };
}

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
  FORD_VOUCHER_NAME,
  FORD_VOUCHER_MIN,
  FORD_VOUCHER_MAX,
  FORD_VOUCHER_STEP,
  isFordVerificationMethod,
  fordDemoPrizes,
  fordVoucherDisplayName,
  fordManifestPrizes,
  validateFordEntryPayload,
};
