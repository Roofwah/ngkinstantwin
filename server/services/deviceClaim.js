const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { assignPrize } = require('./prizeEngine');
const { log } = require('./auditLogger');
const { campaignBrandOptions } = require('./demoCampaign');

function normaliseMobile(mobile) {
  const s = (mobile || '').replace(/[\s\-()]/g, '');
  if (/^\+614/.test(s)) return '0' + s.slice(3);
  return s;
}

function deriveStoreCode(invoiceNumber) {
  const digits = String(invoiceNumber || '').replace(/\D/g, '');
  return digits.length >= 3 ? digits.slice(0, 3) : '';
}

function validateReceiptPayload(body, file) {
  const errors = [];
  const invoiceNumber = (body.invoiceNumber || '').trim();
  const receiptSource = body.receiptSource || '';
  const isManual = receiptSource === 'manual';

  if (!invoiceNumber || !/^\d{10}$/.test(invoiceNumber)) {
    errors.push('Invoice number must be exactly 10 digits');
  }

  if (!body.purchaseDate || !String(body.purchaseDate).trim()) {
    errors.push('Purchase date is required');
  }

  if (!body.selectedBrand) {
    errors.push('Brand is required');
  }

  const spend = parseFloat(body.spendAmount);
  if (!spend || spend <= 0) {
    errors.push('Valid purchase amount is required');
  }

  if (!isManual && !file) {
    errors.push('Receipt image or PDF is required');
  }

  if (isManual && !(body.productDescription || '').trim()) {
    errors.push('Product description is required for manual entry');
  }

  const allowedSources = ['camera', 'gallery', 'pdf', 'manual'];
  if (!allowedSources.includes(receiptSource)) {
    errors.push('Invalid receipt source');
  }

  const verificationMethod = isManual ? 'manual' : 'auto_pending';
  const storeCode = deriveStoreCode(invoiceNumber);
  if (body.storeCode && body.storeCode !== storeCode) {
    errors.push('Store code must match the first 3 digits of the invoice number');
  }

  return {
    errors,
    invoiceNumber,
    purchaseDate: String(body.purchaseDate).trim(),
    storeCode,
    productDescription: (body.productDescription || '').trim() || null,
    selectedBrand: body.selectedBrand,
    spendAmount: spend,
    receiptSource,
    verificationMethod,
    receiptValidationStatus: 'pending',
  };
}

function resolveClaimStatus(result, verificationMethod) {
  if (verificationMethod === 'manual') {
    return 'VALIDATION_PENDING';
  }
  if (result === 'TIER_1_INSTANT_WIN') return 'VALIDATED';
  if (result === 'TIER_2_PROVISIONAL_WIN' || result === 'TIER_3_PROVISIONAL_WIN') {
    return 'VALIDATION_PENDING';
  }
  return 'ELIGIBLE';
}

function createClaimWithReceipt({
  mobile,
  body,
  file,
  ipAddress,
  campaign,
  deviceCode,
  campaignId,
  tokenId,
  tokenRecord,
}) {
  const normMobile = normaliseMobile(mobile);
  if (!/^04\d{8}$/.test(normMobile)) {
    return { error: 'Invalid mobile number', status: 400 };
  }

  const allowedBrands = campaignBrandOptions(campaign);
  if (!allowedBrands.includes(body.selectedBrand)) {
    return { error: 'Invalid brand for this campaign', status: 400 };
  }

  const validated = validateReceiptPayload(body, file);
  if (validated.errors.length) {
    return { error: validated.errors[0], errors: validated.errors, status: 400 };
  }

  const dup = db.prepare('SELECT claimId FROM claims WHERE receiptNumber = ?').get(validated.invoiceNumber);
  if (dup) {
    return { error: 'This invoice number has already been used.', status: 409 };
  }

  const claimId = uuidv4();
  const now = Date.now();
  const receiptFilename = file ? file.filename : null;

  db.prepare(`
    INSERT INTO claims
      (claimId, mobile, receiptNumber, receiptFilename, spendAmount, selectedBrand,
       termsAccepted, result, claimStatus, createdAt, ipAddress,
       purchaseDate, storeCode, productSku, productDescription,
       receiptSource, verificationMethod, receiptValidationStatus)
    VALUES (?, ?, ?, ?, ?, ?, 1, 'NOT_WINNER', 'ELIGIBLE', ?, ?,
            ?, ?, ?, ?, ?, ?, ?)
  `).run(
    claimId,
    normMobile,
    validated.invoiceNumber,
    receiptFilename,
    validated.spendAmount,
    validated.selectedBrand,
    now,
    ipAddress || '',
    validated.purchaseDate,
    validated.storeCode,
    null,
    validated.productDescription,
    validated.receiptSource,
    validated.verificationMethod,
    validated.receiptValidationStatus,
  );

  const { result, prize } = assignPrize(claimId, now);
  const claimStatus = resolveClaimStatus(result, validated.verificationMethod);

  db.prepare(`
    UPDATE claims SET result = ?, claimStatus = ?, prizeId = ?, prizeName = ? WHERE claimId = ?
  `).run(result, claimStatus, prize?.prizeId || null, prize?.prizeName || null, claimId);

  if (tokenId && tokenRecord) {
    db.prepare('UPDATE issued_tokens SET status = ?, redeemedAt = ?, claimId = ? WHERE id = ?')
      .run('redeemed', now, claimId, tokenId);
  }

  const auditAction = tokenId ? 'device_token_redeemed' : 'direct_claim_created';
  log(auditAction, {
    claimId,
    details: {
      deviceCode,
      campaignId,
      mobile: normMobile.slice(0, 4) + '****',
      result,
      invoiceNumber: validated.invoiceNumber,
      receiptSource: validated.receiptSource,
      verificationMethod: validated.verificationMethod,
      receiptValidationStatus: validated.receiptValidationStatus,
      selectedBrand: validated.selectedBrand,
      spendAmount: validated.spendAmount,
      tokenId: tokenId || undefined,
      token: tokenRecord?.token,
    },
  });

  return { claimId, success: true };
}

module.exports = {
  normaliseMobile,
  deriveStoreCode,
  validateReceiptPayload,
  createClaimWithReceipt,
};
