const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { assignPrize } = require('./prizeEngine');
const { log } = require('./auditLogger');
const { campaignBrandOptions } = require('./demoCampaign');
const { getSession } = require('./labSession');
const { attachRedemption } = require('./redemption');
const { notifyHokaWinnerSafe } = require('./winnerNotify');
const {
  isHokaCampaign,
  isInstantWin,
  hokaMinSpend,
  hokaPrizeName,
  HOKA_STORE_NAME,
} = require('../lib/hokaCampaign');

function labAllowsDuplicateReceipts(labSessionId) {
  if (!labSessionId) return false;
  const session = getSession(labSessionId);
  return Boolean(session?.rules?.allowDuplicateReceipts);
}

/** Demo / lab — skip duplicate-invoice enforcement (check remains for production). */
function shouldBypassDuplicateInvoice(body) {
  if (body.labSessionId) return true;
  return process.env.DEMO_MODE === 'true';
}

function clearClaimForDuplicateReceipt(invoiceNumber) {
  db.prepare('DELETE FROM claims WHERE receiptNumber = ?').run(invoiceNumber);
}

function normaliseMobile(mobile) {
  const s = (mobile || '').replace(/[\s\-()]/g, '');
  if (/^\+614/.test(s)) return '0' + s.slice(3);
  return s;
}

function normaliseCustomerName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function isValidCustomerName(name) {
  return name.length >= 2 && /^[A-Za-z][A-Za-z\s'.-]*$/.test(name);
}

function deriveStoreCode(invoiceNumber) {
  const digits = String(invoiceNumber || '').replace(/\D/g, '');
  return digits.length >= 3 ? digits.slice(0, 3) : '';
}

function isValidAuPostcode(raw) {
  return /^\d{4}$/.test(String(raw || '').trim());
}

function formatAuPostcode(raw) {
  return String(raw || '').replace(/\D/g, '').slice(0, 4);
}

function validateHokaPayload(body, campaign, deviceRow) {
  const errors = [];
  const postcode = formatAuPostcode(body.postcode);
  if (!isValidAuPostcode(postcode)) {
    errors.push('Enter a valid Australian postcode');
  }

  const spend = parseFloat(body.spendAmount);
  const minSpend = hokaMinSpend(campaign);
  if (!spend || spend < minSpend) {
    errors.push(`Minimum qualifying purchase is $${minSpend.toFixed(2)}`);
  }

  if (!body.selectedBrand) {
    errors.push('Item purchased is required');
  }

  const today = new Date().toISOString().slice(0, 10);
  const invoiceNumber = `HOKA${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;

  return {
    errors,
    invoiceNumber,
    purchaseDate: today,
    purchaseTime: null,
    storeCode: deviceRow?.storeCode || 'BHM',
    storeName: deviceRow?.storeName || HOKA_STORE_NAME,
    productDescription: body.selectedBrand || null,
    selectedBrand: body.selectedBrand,
    spendAmount: spend,
    receiptSource: 'manual',
    verificationMethod: 'hoka_entry',
    receiptValidationStatus: 'not_required',
    postcode,
  };
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
    purchaseTime: body.purchaseTime ? String(body.purchaseTime).trim() : null,
    storeCode,
    storeName: (body.storeName || '').trim() || null,
    productDescription: (body.productDescription || '').trim() || null,
    selectedBrand: body.selectedBrand,
    spendAmount: spend,
    receiptSource,
    verificationMethod,
    receiptValidationStatus: 'pending',
  };
}

function resolveClaimStatus(result, verificationMethod) {
  if (verificationMethod === 'hoka_entry') {
    return isInstantWin(result) ? 'VALIDATED' : 'ELIGIBLE';
  }
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

  const customerName = normaliseCustomerName(body.customerName);
  if (!isValidCustomerName(customerName)) {
    return { error: 'Full name is required', status: 400 };
  }

  const allowedBrands = campaignBrandOptions(campaign);
  if (!allowedBrands.includes(body.selectedBrand)) {
    return { error: 'Invalid brand for this campaign', status: 400 };
  }

  const hoka = isHokaCampaign(campaign);
  const deviceRow = deviceCode
    ? db.prepare('SELECT * FROM devices WHERE deviceCode = ?').get(deviceCode)
    : null;

  const validated = hoka
    ? validateHokaPayload(body, campaign, deviceRow)
    : validateReceiptPayload(body, file);
  if (validated.errors.length) {
    return { error: validated.errors[0], errors: validated.errors, status: 400 };
  }

  const bypassDuplicate = hoka || shouldBypassDuplicateInvoice(body);
  if (bypassDuplicate) {
    clearClaimForDuplicateReceipt(validated.invoiceNumber);
  } else {
    const dup = db.prepare('SELECT claimId FROM claims WHERE receiptNumber = ?').get(validated.invoiceNumber);
    if (dup) {
      return { error: 'This invoice number has already been used.', status: 409 };
    }
  }

  const claimId = uuidv4();
  const now = Date.now();
  const receiptFilename = file ? file.filename : null;
  const resolvedCampaignId = campaignId || campaign?.id || null;

  db.prepare(`
    INSERT INTO claims
      (claimId, mobile, customerName, receiptNumber, receiptFilename, spendAmount, selectedBrand,
       termsAccepted, result, claimStatus, createdAt, ipAddress,
       purchaseDate, purchaseTime, storeCode, storeName, productSku, productDescription,
       receiptSource, verificationMethod, receiptValidationStatus, campaignId, postcode)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'NOT_WINNER', 'ELIGIBLE', ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    claimId,
    normMobile,
    customerName,
    validated.invoiceNumber,
    receiptFilename,
    validated.spendAmount,
    validated.selectedBrand,
    now,
    ipAddress || '',
    validated.purchaseDate,
    validated.purchaseTime,
    validated.storeCode,
    validated.storeName,
    null,
    validated.productDescription,
    validated.receiptSource,
    validated.verificationMethod,
    validated.receiptValidationStatus,
    resolvedCampaignId,
    validated.postcode || null,
  );

  const { result, prize } = assignPrize(claimId, now, resolvedCampaignId);
  const claimStatus = resolveClaimStatus(result, validated.verificationMethod);
  let prizeName = prize?.prizeName || null;
  if (hoka && isInstantWin(result)) {
    prizeName = hokaPrizeName(campaign, result, validated.spendAmount, prize);
  }

  db.prepare(`
    UPDATE claims SET result = ?, claimStatus = ?, prizeId = ?, prizeName = ? WHERE claimId = ?
  `).run(result, claimStatus, prize?.prizeId || null, prizeName, claimId);

  if (hoka && isInstantWin(result)) {
    try {
      attachRedemption(claimId);
      notifyHokaWinnerSafe(claimId);
    } catch (err) {
      console.error(`[hoka] redemption persist failed for ${claimId}:`, err.message);
      log('hoka_redemption_failed', { claimId, details: { error: err.message, result } });
    }
  }

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
      customerName,
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
