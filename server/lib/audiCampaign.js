const AUDI_CAMPAIGN_ID = 'audi-2026';
const AUDI_STORE_NAME = 'Audi Centre Zetland';
const AUDI_STORE_LOCATION = 'Zetland NSW';

const AUDI_MODELS = [
  'A3', 'A4', 'A5', 'A6',
  'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9',
];

function audiStoreName(campaign) {
  return campaign?.config?.defaultStoreName || AUDI_STORE_NAME;
}

function audiStoreCode(campaign) {
  return campaign?.config?.defaultStoreCode || 'zetland';
}

function audiModelOptions(campaign) {
  const fromConfig = campaign?.config?.eligibleBrands;
  if (Array.isArray(fromConfig) && fromConfig.length > 0) return fromConfig;
  return AUDI_MODELS;
}

const AUDI_VOUCHER_NAME = 'Audi service or accessories voucher';
const AUDI_PRIZE_IMAGE = '/campaigns/audi/gift.png';
const AUDI_VOUCHER_MIN = 500;
const AUDI_VOUCHER_MAX = 800;
const AUDI_VOUCHER_STEP = 50;
const AUDI_VOUCHER_VALUES = Array.from(
  { length: (AUDI_VOUCHER_MAX - AUDI_VOUCHER_MIN) / AUDI_VOUCHER_STEP + 1 },
  (_, i) => AUDI_VOUCHER_MIN + i * AUDI_VOUCHER_STEP,
);

function audiDemoPrizes() {
  return AUDI_VOUCHER_VALUES.map((value) => ({
    name: AUDI_VOUCHER_NAME,
    value,
    qty: 2,
  }));
}

function audiVoucherDisplayName() {
  return AUDI_VOUCHER_NAME;
}

function audiManifestPrizes() {
  return {
    tier1: AUDI_VOUCHER_VALUES.flatMap((value) => ([
      { prizeName: AUDI_VOUCHER_NAME, value },
      { prizeName: AUDI_VOUCHER_NAME, value },
    ])),
    tier2: [],
    tier3: [],
  };
}

function audiPrizeImagePath(prizeName) {
  if (!prizeName) return null;
  return AUDI_PRIZE_IMAGE;
}

const AUDI_VERIFICATION_METHOD = 'audi_instant_win';
const LEGACY_AUDI_VERIFICATION = 'audi_crossword';

function isAudiVerificationMethod(method) {
  return method === AUDI_VERIFICATION_METHOD || method === LEGACY_AUDI_VERIFICATION;
}

function normaliseContractNumber(raw) {
  return String(raw || '').trim();
}

function validateAudiEntryPayload(body, campaign, deviceRow, allowedModels) {
  const errors = [];
  const models = allowedModels?.length ? allowedModels : audiModelOptions(campaign);

  const contractNumber = normaliseContractNumber(body.contractNumber || body.invoiceNumber);
  if (!/^\d{4}$/.test(contractNumber)) {
    errors.push('Enter the last 4 digits of your contract number');
  }

  if (!body.selectedBrand) {
    errors.push('Model is required');
  } else if (!models.includes(body.selectedBrand)) {
    errors.push('Invalid model for this campaign');
  }

  const today = new Date().toISOString().slice(0, 10);

  return {
    errors,
    invoiceNumber: contractNumber,
    purchaseDate: today,
    purchaseTime: null,
    storeCode: audiStoreCode(campaign),
    storeName: audiStoreName(campaign),
    productDescription: body.selectedBrand || null,
    selectedBrand: body.selectedBrand,
    spendAmount: 0,
    receiptSource: 'manual',
    verificationMethod: AUDI_VERIFICATION_METHOD,
    receiptValidationStatus: 'not_required',
  };
}

module.exports = {
  AUDI_CAMPAIGN_ID,
  AUDI_STORE_NAME,
  AUDI_VOUCHER_NAME,
  AUDI_PRIZE_IMAGE,
  AUDI_VOUCHER_MIN,
  AUDI_VOUCHER_MAX,
  AUDI_VERIFICATION_METHOD,
  isAudiVerificationMethod,
  audiModelOptions,
  audiDemoPrizes,
  audiVoucherDisplayName,
  audiManifestPrizes,
  audiPrizeImagePath,
  validateAudiEntryPayload,
  validateAudiCrosswordPayload: validateAudiEntryPayload,
};
