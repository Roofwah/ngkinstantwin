const NITERRA_CAMPAIGN_ID = 'niterra-ngk-2026';
const NITERRA_STORE_NAME = 'Repco Waurn Ponds';
const DEFAULT_MIN_SPEND = 50;

function niterraMinSpend(campaign) {
  const n = Number(campaign?.config?.minSpend);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MIN_SPEND;
}

/** Public asset path for known Niterra instant-win prizes (cap.png for caps). */
function niterraPrizeImagePath(prizeName) {
  if (!prizeName) return null;
  if (/cap/i.test(String(prizeName))) return '/campaigns/niterra/cap.png';
  return null;
}

function validateNiterraCrosswordPayload(body, campaign, deviceRow, allowedBrands) {
  const errors = [];

  const spend = parseFloat(body.spendAmount);
  const minSpend = niterraMinSpend(campaign);
  if (!spend || spend < minSpend) {
    errors.push(`Minimum qualifying purchase is $${minSpend.toFixed(2)}`);
  }

  if (!body.selectedBrand) {
    errors.push('Item purchased is required');
  } else if (allowedBrands?.length && !allowedBrands.includes(body.selectedBrand)) {
    errors.push('Invalid brand for this campaign');
  }

  const today = new Date().toISOString().slice(0, 10);
  const invoiceNumber = `NGK${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;

  return {
    errors,
    invoiceNumber,
    purchaseDate: today,
    purchaseTime: null,
    storeCode: deviceRow?.storeCode || '247',
    storeName: deviceRow?.storeName || NITERRA_STORE_NAME,
    productDescription: body.selectedBrand || null,
    selectedBrand: body.selectedBrand,
    spendAmount: spend,
    receiptSource: 'manual',
    verificationMethod: 'niterra_crossword',
    receiptValidationStatus: 'not_required',
  };
}

module.exports = {
  NITERRA_CAMPAIGN_ID,
  NITERRA_STORE_NAME,
  niterraMinSpend,
  niterraPrizeImagePath,
  validateNiterraCrosswordPayload,
};
