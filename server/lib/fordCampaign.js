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

/** e.g. "$650 Ford service or accessories voucher" */
function fordPrizeLabel(prizeName, prizeValue) {
  const name = prizeName || FORD_VOUCHER_NAME;
  const value = Number(prizeValue);
  if (!Number.isFinite(value) || value <= 0) return name;
  if (/^\$\d/.test(String(name))) return name;
  return `$${value} ${name}`;
}

function isFordClaim(claim) {
  if (!claim) return false;
  if (claim.campaignId === FORD_CAMPAIGN_ID) return true;
  return isFordVerificationMethod(claim.verificationMethod);
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

function normaliseContractNumber(raw) {
  return String(raw || '').trim();
}

function validateFordEntryPayload(body, campaign, deviceRow, allowedVehicles) {
  const errors = [];
  const contractNumber = normaliseContractNumber(body.contractNumber || body.invoiceNumber);

  if (!/^\d{4}$/.test(contractNumber)) {
    errors.push('Enter the last 4 digits of your sales contract number');
  }

  if (!body.selectedBrand) {
    errors.push('Purchased Vehicle is required');
  } else if (allowedVehicles?.length && !allowedVehicles.includes(body.selectedBrand)) {
    errors.push('Invalid vehicle for this campaign');
  }

  const today = new Date().toISOString().slice(0, 10);
  const storeCode = deviceRow?.storeCode || campaign?.config?.defaultStoreCode || 'FRD';

  return {
    errors,
    invoiceNumber: contractNumber,
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
  isFordClaim,
  fordDemoPrizes,
  fordVoucherDisplayName,
  fordPrizeLabel,
  fordManifestPrizes,
  validateFordEntryPayload,
};
