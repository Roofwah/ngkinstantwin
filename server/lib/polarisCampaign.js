const POLARIS_CAMPAIGN_ID = 'polaris-2026';
const POLARIS_VERIFICATION_METHOD = 'polaris_agpower';

const POLARIS_CASHBACK_NAME = 'Cashback';
const POLARIS_CASHBACK_MIN = 100;
const POLARIS_CASHBACK_MAX = 1000;
const POLARIS_CASHBACK_STEP = 50;
const POLARIS_CASHBACK_VALUES = Array.from(
  { length: (POLARIS_CASHBACK_MAX - POLARIS_CASHBACK_MIN) / POLARIS_CASHBACK_STEP + 1 },
  (_, i) => POLARIS_CASHBACK_MIN + i * POLARIS_CASHBACK_STEP,
);

/** @deprecated use POLARIS_CASHBACK_NAME */
const POLARIS_CASH_NAME = POLARIS_CASHBACK_NAME;
/** @deprecated use POLARIS_CASHBACK_MAX */
const POLARIS_CASH_VALUE = POLARIS_CASHBACK_MAX;

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
  return POLARIS_CASHBACK_VALUES.map((value) => ({
    name: POLARIS_CASHBACK_NAME,
    value,
    qty: 2,
  }));
}

function polarisCashDisplayName() {
  return POLARIS_CASHBACK_NAME;
}

/** e.g. "$650 Cashback" */
function polarisPrizeLabel(prizeName, prizeValue) {
  const name = prizeName || POLARIS_CASHBACK_NAME;
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
    tier1: POLARIS_CASHBACK_VALUES.flatMap((value) => ([
      { prizeName: POLARIS_CASHBACK_NAME, value },
      { prizeName: POLARIS_CASHBACK_NAME, value },
    ])),
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
  POLARIS_CASHBACK_NAME,
  POLARIS_CASHBACK_MIN,
  POLARIS_CASHBACK_MAX,
  POLARIS_CASHBACK_STEP,
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
