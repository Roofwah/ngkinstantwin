const POLARIS_CAMPAIGN_ID = 'polaris-2026';
const POLARIS_VERIFICATION_METHOD = 'polaris_agpower';

const POLARIS_CASH_NAME = 'Cash';
const POLARIS_CASH_VALUE = 1000;

const POLARIS_MODELS = [
  'Ranger 500',
  'Ranger SP 570 HD',
  'General XP 1000 Sport',
  'Ranger 1000 Premium',
  'Ranger XP 1000HD',
  'Ranger Diesel HD',
  'Ranger XP 1000 Northstar',
  'General XP 4 1000',
];

function polarisDemoPrizes() {
  return [{ name: POLARIS_CASH_NAME, value: POLARIS_CASH_VALUE, qty: 40 }];
}

function polarisCashDisplayName() {
  return POLARIS_CASH_NAME;
}

/** e.g. "$1000 Cash" */
function polarisPrizeLabel(prizeName, prizeValue) {
  const name = prizeName || POLARIS_CASH_NAME;
  const value = Number(prizeValue);
  if (!Number.isFinite(value) || value <= 0) return name;
  if (/^\$\d/.test(String(name))) return name;
  return `$${value} ${name}`;
}

function isPolarisClaim(claim) {
  if (!claim) return false;
  if (claim.campaignId === POLARIS_CAMPAIGN_ID) return true;
  return isPolarisVerificationMethod(claim.verificationMethod);
}

function polarisManifestPrizes() {
  return {
    tier1: Array.from({ length: 40 }, () => ({
      prizeName: POLARIS_CASH_NAME,
      value: POLARIS_CASH_VALUE,
    })),
    tier2: [],
    tier3: [],
  };
}

function isPolarisVerificationMethod(method) {
  return method === POLARIS_VERIFICATION_METHOD;
}

function polarisStoreName(campaign, deviceRow) {
  return campaign?.config?.defaultStoreName || deviceRow?.storeName || 'AGPower Lilydale';
}

function normaliseInvoiceTail(raw) {
  return String(raw || '').trim();
}

function validatePolarisEntryPayload(body, campaign, deviceRow, allowedModels) {
  const errors = [];
  const invoiceNumber = normaliseInvoiceTail(body.invoiceNumber || body.contractNumber);

  if (!/^\d{4}$/.test(invoiceNumber)) {
    errors.push('Enter the last 4 digits of your invoice number');
  }

  if (!body.selectedBrand) {
    errors.push('Purchased model is required');
  } else if (allowedModels?.length && !allowedModels.includes(body.selectedBrand)) {
    errors.push('Invalid model for this campaign');
  }

  const today = new Date().toISOString().slice(0, 10);
  const storeCode = deviceRow?.storeCode || campaign?.config?.defaultStoreCode || 'AGP';

  return {
    errors,
    invoiceNumber,
    purchaseDate: today,
    purchaseTime: null,
    storeCode,
    storeName: polarisStoreName(campaign, deviceRow),
    productDescription: body.selectedBrand || null,
    selectedBrand: body.selectedBrand,
    spendAmount: 0,
    receiptSource: 'manual',
    verificationMethod: POLARIS_VERIFICATION_METHOD,
    receiptValidationStatus: 'not_required',
  };
}

module.exports = {
  POLARIS_CAMPAIGN_ID,
  POLARIS_VERIFICATION_METHOD,
  POLARIS_CASH_NAME,
  POLARIS_CASH_VALUE,
  POLARIS_MODELS,
  isPolarisVerificationMethod,
  isPolarisClaim,
  polarisDemoPrizes,
  polarisCashDisplayName,
  polarisPrizeLabel,
  polarisManifestPrizes,
  validatePolarisEntryPayload,
};
