import { BrowserMultiFormatReader } from '@zxing/browser';

const BRAND_PATTERN = /\b(NGK|NTK|KYB)\b/i;
const FOOTER_NOISE = /contacting|repco on|133\s*227|abn|www\.|http|goods must|returns|thank you|customer service|enquir/i;
const STORE_REJECT = /deliver\s*to|customer|invoice|branch|sales|person|carrier|release|source|total|gst|phone|fax|email|abn|colac\s*rd|repco\b/i;
const INVALID_INVOICE_PREFIXES = ['9065', '1332', '1300'];
const KNOWN_SUBURBS = [
  'WAURN PONDS', 'MAROOCHYDORE', 'BRISBANE', 'SYDNEY', 'MELBOURNE',
  'PERTH', 'ADELAIDE', 'CAIRNS', 'TOOWOOMBA', 'GEELONG', 'BALLARAT',
];

function isValidStoreName(name) {
  if (!name || name.length < 3 || name.length > 35) return false;
  if (FOOTER_NOISE.test(name)) return false;
  if (STORE_REJECT.test(name)) return false;
  if (/\d{2,}/.test(name)) return false;
  return true;
}

function cleanStoreCapture(raw) {
  if (!raw) return '';
  let name = raw.replace(/^(?:REP|RSP)\s+/i, '').trim();
  name = name.split(/\s+(?:ADDRESS|DELIVER|INVOICE|BRANCH|PHONE|ABN|DATE|SALES)\b/i)[0].trim();
  return name;
}

function findKnownSuburb(text) {
  const suburbPattern = new RegExp(`\\b(${KNOWN_SUBURBS.join('|')})\\b`, 'i');
  const hit = text.match(suburbPattern);
  return hit ? titleCase(hit[1].replace(/\s+/g, ' ')) : null;
}

function scoreInvoiceCandidate(num, text, index = 0) {
  let score = 0;
  if (!/^\d{10}$/.test(num)) return -100;
  if (num.startsWith('247')) score += 60;
  if (INVALID_INVOICE_PREFIXES.some((prefix) => num.startsWith(prefix))) score -= 55;
  const branch = Number(num.slice(0, 3));
  if (branch >= 100 && branch <= 999) score += 12;
  const window = text.slice(Math.max(0, index - 50), index + 70);
  if (/INVOICE/i.test(window)) score += 45;
  if (FOOTER_NOISE.test(window)) score -= 40;
  return score;
}

/** Extract 10-digit Repco-style invoice number from OCR or barcode text. */
export function extractInvoiceNumber(text, { barcodeText = null } = {}) {
  if (!text && !barcodeText) return null;

  const candidates = new Map();
  const source = text || '';

  function consider(num, score) {
    if (/^\d{10}$/.test(num)) {
      candidates.set(num, Math.max(candidates.get(num) ?? -999, score));
    }
  }

  for (const m of source.matchAll(/INVOICE\s*(?:NO\.?|NUMBER)?\s*:?\s*([\d\s]{10,18})/gi)) {
    const digits = m[1].replace(/\s/g, '');
    if (digits.length >= 10) consider(digits.slice(0, 10), 100);
  }

  for (const m of source.matchAll(/\b(247\d{7})\b/g)) {
    consider(m[1], 96);
  }

  for (const m of source.matchAll(/\b(\d{10})\b/g)) {
    consider(m[1], scoreInvoiceCandidate(m[1], source, m.index ?? 0));
  }

  const allDigits = source.replace(/\D/g, '');
  const embedded247 = allDigits.match(/247\d{7}/);
  if (embedded247) consider(embedded247[0], 94);

  if (barcodeText) {
    const bc = barcodeText.replace(/\D/g, '');
    const bc247 = bc.match(/247\d{7}/);
    if (bc247) consider(bc247[0], 90);
    if (bc.length === 10) consider(bc, bc.startsWith('247') ? 75 : 5);
  }

  if (!candidates.size) return null;
  return [...candidates.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function formatParsedDate(dd, mm, yy) {
  const day = String(dd).padStart(2, '0');
  const month = String(mm).padStart(2, '0');
  const year = String(yy).length === 2 ? `20${yy}` : String(yy);
  return {
    iso: `${year}-${month}-${day}`,
    display: `${day}/${month}/${year}`,
  };
}

function extractTimeFallback(text) {
  const m = text.match(/TIME\s*:?\s*(\d{1,2}:\d{2})/i);
  return m ? m[1] : null;
}

function normalizeOcrText(text) {
  return String(text || '')
    .replace(/\r/g, '\n')
    .replace(/\bST0RE\b/gi, 'STORE')
    .replace(/\bDA\s*TE\b/gi, 'DATE')
    .replace(/\bT\s*IME\b/gi, 'TIME')
    .replace(/\bINVO\s*ICE\b/gi, 'INVOICE')
    .replace(/[|]/g, 'I');
}

/**
 * Emailed Repco tax invoice (PDF or screenshot-of-PDF saved as a photo).
 * Date only — no TIME field on this format.
 */
export function isRepcoTaxInvoice(text) {
  if (!text) return false;
  if (/Tax\s*Invoice/i.test(text)) return true;
  if (/STORE\s*:/i.test(text) && /Invoice\s*No/i.test(text)) return true;
  if (/DELIVER\s*TO/i.test(text) && /Branch\s*No/i.test(text)) return true;
  let score = 0;
  if (/STORE\s*:/i.test(text)) score += 1;
  if (/Invoice\s*No/i.test(text)) score += 1;
  if (/Total\s*Incl/i.test(text)) score += 1;
  if (/DELIVER\s*TO/i.test(text)) score += 1;
  if (/Branch\s*No/i.test(text)) score += 1;
  return score >= 2;
}

/** True when receipt format includes a TIME field (in-store thermal, not emailed PDF). */
export function receiptHasTimeField(text) {
  if (!text || isRepcoTaxInvoice(text)) return false;
  if (/\bTIME\s*:?\s*\d{1,2}:\d{2}/i.test(text)) return true;
  // DATE + TIME on same header line — thermal layout; time value may have failed OCR
  if (/\bDATE\s*:?\s*\d{1,2}\/\d{1,2}\/\d{2,4}[\s\S]{0,32}\bTIME\s*:?/i.test(text)) return true;
  return false;
}

/** Parse DATE line → { iso, display, time, timeOnReceipt } */
export function extractDateTime(text) {
  if (!text) return { iso: null, display: null, time: null, timeOnReceipt: false };

  const timeOnReceipt = receiptHasTimeField(text);

  const patterns = [
    /DATE\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+TIME\s*:?\s*(\d{1,2}:\d{2}))?/i,
    /DATE[\s\S]{0,24}?(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i,
    /Invoice\s*No\.?\s*:?\s*\d{6,12}[\s\S]{0,120}?(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i,
    /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/,
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (!m) continue;
    const { iso, display } = formatParsedDate(m[1], m[2], m[3]);
    const time = timeOnReceipt ? (m[4] || extractTimeFallback(text)) : null;
    return { iso, display, time, timeOnReceipt };
  }

  return { iso: null, display: null, time: null, timeOnReceipt };
}

/** Repco store suburb/location from header lines (thermal + tax invoice PDF). */
export function extractStoreName(text) {
  if (!text) return null;

  const header = text.slice(0, Math.min(1200, text.length));

  const thermal = header.match(/\bREPCO\s+([A-Z][A-Z\s'-]{2,30}?)\s+PH\b/i);
  if (thermal && isValidStoreName(thermal[1])) return titleCase(thermal[1].trim());

  const taxStore = header.match(
    /STORE\s*:\s*(?:REP|RSP)\s+([A-Z][A-Z\s'-]+?)(?=\s+ADDRESS|\s+DELIVER|\s+INVOICE|\s+BRANCH|$)/i,
  );
  if (taxStore && isValidStoreName(taxStore[1])) return titleCase(taxStore[1].trim());

  const known = findKnownSuburb(header);
  if (known) return known;

  const storeLine = header.match(/(?:^|\n)\s*STORE\s*:\s*([^\n]+)/im);
  if (storeLine) {
    const name = cleanStoreCapture(storeLine[1]);
    if (isValidStoreName(name)) return titleCase(name);
  }

  const addressSuburb = header.match(
    /ADDRESS\s*:?\s*[\d\-A-Z\s,]+?\s+([A-Z][A-Z\s'-]{2,30})\b/i,
  ) || header.match(/ADDRESS\s*:?\s*[^\n]+\n\s*([A-Z][A-Z\s'-]{2,30})\b/i);
  if (addressSuburb && isValidStoreName(addressSuburb[1])) {
    return titleCase(addressSuburb[1].trim());
  }

  const lines = header.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const repcoSuburb = line.match(/\bREPCO\s+([A-Z][A-Z\s'-]{2,30}?)\s+PH\b/i);
    if (repcoSuburb && isValidStoreName(repcoSuburb[1])) {
      return titleCase(repcoSuburb[1].trim());
    }
    const suburbPh = line.match(/^([A-Z][A-Z\s'-]{2,30})\s+PH\b/i);
    if (suburbPh && isValidStoreName(suburbPh[1])) return titleCase(suburbPh[1].trim());
  }

  return findKnownSuburb(text);
}

function titleCase(s) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export function extractTotalAmount(text) {
  if (!text) return null;
  const patterns = [
    /TOTAL\s*INCL\.?\s*GST[\s\S]{0,48}?\$?\s*([\d]+(?:\.\d{1,2})?)/i,
    /TOTAL\s*:?\s*\$?\s*([\d]+(?:\.\d{1,2})?)/i,
    /(?:INCL\.?\s*GST|GST\s*PAYABLE)[\s\S]{0,40}?\$?\s*([\d]+(?:\.\d{1,2})?)/i,
  ];
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) return m[1];
  }
  if (/total/i.test(text)) {
    const nearTotal = text.match(/total[\s\S]{0,80}?\$?\s*(\d{1,3}\.\d{2})/i);
    if (nearTotal) return nearTotal[1];
  }
  return null;
}

function uniqueProductLines(items) {
  const byAmount = new Map();
  for (const item of items) {
    if (item.amount <= 0 || item.amount >= 500) continue;
    if (!byAmount.has(item.amount)) byAmount.set(item.amount, item);
  }
  return [...byAmount.values()];
}

function resolveSpendAmount(eligible, invoiceTotal, taxInvoice) {
  if (eligible.spendAmount) return eligible.spendAmount;
  if (!invoiceTotal) return null;
  const total = parseFloat(invoiceTotal);
  if (!(total > 0 && total <= 500)) return null;

  const products = uniqueProductLines(eligible.lineItems || []);
  if (taxInvoice || products.length === 0 || products.length === 1) {
    return total.toFixed(2);
  }
  if (products.every((p) => p.amount === total)) return total.toFixed(2);
  return null;
}

function extractTaxProductDescription(text) {
  if (!text) return null;
  const spark = text.match(
    /\b(\d{3,5}\s+STD\s+COMPACT\s+SPARK\s+PLUG|SPARK\s+PLUG[^\n$]{0,50})\b/i,
  );
  if (spark) return spark[1].trim();
  const row = text.match(/[A-Z0-9]{3,8}\s+([A-Z][A-Z0-9\s'-]{4,45}?)\s+\d+\s+\$?\d+\.\d{2}/i);
  return row ? row[1].trim() : null;
}

/** Line items with trailing unit price (Repco thermal + tax invoice layout). */
export function extractLineItems(text) {
  if (!text) return [];
  const items = [];
  const seen = new Set();

  function addItem(description, amount) {
    const key = `${description}|${amount}`;
    if (seen.has(key) || amount <= 0 || amount >= 500) return;
    seen.add(key);
    items.push({ description: description.trim(), amount });
  }

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || /^(TOTAL|GST|ROUNDING|CHANGE|SUB|BALANCE|ANZ|EFTPOS|REPCO|INVOICE|DATE|ABN|TAX|BRANCH|DELIVER)/i.test(line)) {
      continue;
    }
    const taxRow = line.match(/^[A-Z0-9]{3,8}\s+(.+?)\s+\d+\s+\$?(\d+\.\d{2})\s*$/i);
    if (taxRow) {
      addItem(taxRow[1], parseFloat(taxRow[2]));
      continue;
    }
    const m = line.match(/^(.+?)\s+\d+\s+(\d+\.\d{2})\s*$/);
    if (m) {
      addItem(m[1], parseFloat(m[2]));
      continue;
    }
    const tail = line.match(/^(.+?)\s+\$?(\d+\.\d{2})\s*$/);
    if (tail && !/^\d/.test(tail[1]) && !/^(TOTAL|GST|SUB)/i.test(tail[1])) {
      addItem(tail[1], parseFloat(tail[2]));
    }
  }

  for (const m of text.matchAll(
    /[A-Z0-9]{3,8}\s+([A-Z][A-Z0-9\s'-]{4,45}?)\s+\d+\s+\$?(\d+\.\d{2})/gi,
  )) {
    if (/TOTAL|GST|INVOICE|BRANCH|ROUNDING/i.test(m[0])) continue;
    addItem(m[1], parseFloat(m[2]));
  }

  return items;
}

/** Sum line items that mention NGK / NTK / KYB; detect brand hints. */
export function extractEligiblePurchase(text, brands = ['NGK', 'NTK', 'KYB']) {
  const items = extractLineItems(text);
  const brandSet = new Set(brands.map(b => b.toUpperCase()));
  const matched = [];
  let eligibleTotal = 0;

  for (const item of items) {
    const hit = item.description.match(BRAND_PATTERN);
    if (hit && brandSet.has(hit[1].toUpperCase())) {
      matched.push({ ...item, brand: hit[1].toUpperCase() });
      eligibleTotal += item.amount;
    }
  }

  if (matched.length > 0) {
    return {
      spendAmount: eligibleTotal.toFixed(2),
      detectedBrand: matched[0].brand,
      productDescription: matched.map(i => i.description).join('; '),
      confidence: 'brand_line',
      lineItems: items,
      matchedItems: matched,
    };
  }

  // Single product line (common on small receipts) — suggest amount, user confirms brand
  const productLines = uniqueProductLines(items);
  if (productLines.length === 1) {
    return {
      spendAmount: productLines[0].amount.toFixed(2),
      detectedBrand: null,
      productDescription: productLines[0].description,
      confidence: 'single_line',
      lineItems: items,
      matchedItems: [],
    };
  }

  const invoiceTotal = extractTotalAmount(text);
  const taxInvoice = isRepcoTaxInvoice(text);

  if (invoiceTotal) {
    const total = parseFloat(invoiceTotal);
    if (total > 0 && total <= 500 && (taxInvoice || productLines.length <= 1)) {
      return {
        spendAmount: total.toFixed(2),
        detectedBrand: null,
        productDescription: productLines[0]?.description || extractTaxProductDescription(text),
        confidence: taxInvoice ? 'invoice_total' : 'single_line',
        invoiceTotal,
        lineItems: items,
        matchedItems: [],
      };
    }
  }

  return {
    spendAmount: null,
    detectedBrand: null,
    productDescription: productLines.map((i) => i.description).join('; ') || null,
    confidence: 'none',
    invoiceTotal,
    lineItems: items,
    matchedItems: [],
  };
}

export function deriveStoreCodeFromInvoice(invoiceNumber) {
  const digits = String(invoiceNumber || '').replace(/\D/g, '');
  return digits.length >= 3 ? digits.slice(0, 3) : '';
}

const FIELD_HINTS = {
  invoiceNumber: 'Include the top of the receipt where INVOICE: ########## is printed. Avoid glare and keep the number in focus.',
  storeName: 'Make sure the Repco store name/suburb header is visible (not cut off).',
  purchaseDate: 'The DATE: line must be in frame — check lighting and that the header isn\'t cropped.',
  purchaseTime: 'The TIME: line on your in-store receipt must be readable.',
  spendAmount: 'We couldn\'t match an NGK, NTK or KYB line item. Confirm the eligible product line is visible, or enter the amount for qualifying products only (not the invoice total if it includes other items).',
};

export function buildReadAssessment(fields, { requireTime = false } = {}) {
  const read = {};
  const missing = [];
  const issues = [];

  const checks = [
    ['invoiceNumber', fields.invoiceNumber],
    ['storeName', fields.storeName],
    ['purchaseDate', fields.purchaseDateDisplay],
    ...(requireTime ? [['purchaseTime', fields.purchaseTime]] : []),
    ['spendAmount', fields.spendAmount],
  ];

  for (const [key, val] of checks) {
    const ok = val != null && String(val).trim() !== '';
    read[key] = ok;
    if (!ok) {
      missing.push(key);
      issues.push({ field: key, reason: FIELD_HINTS[key] });
    }
  }

  return { read, missing, issues };
}

async function decodeBarcodeFromUrl(imageUrl) {
  try {
    const reader = new BrowserMultiFormatReader();
    const result = await reader.decodeFromImageUrl(imageUrl);
    return result?.getText() || null;
  } catch {
    return null;
  }
}

async function loadImageElement(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageUrl;
  });
}

/** Upscale photos/screenshots so OCR reads small tax-invoice text more reliably. */
async function preprocessImageForOcr(imageUrl) {
  const img = await loadImageElement(imageUrl);
  const longest = Math.max(img.width, img.height);
  const scale = longest < 1600 ? Math.min(2.5, 1600 / longest) : 1;
  if (scale <= 1) return imageUrl;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return URL.createObjectURL(
    await new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', 0.95))
  );
}

async function ocrImageUrl(imageUrl) {
  const { createWorker } = await import('tesseract.js');
  const preparedUrl = await preprocessImageForOcr(imageUrl);
  const worker = await createWorker('eng', 1, { logger: () => {} });
  try {
    const { data: { text } } = await worker.recognize(preparedUrl);
    return text;
  } finally {
    await worker.terminate();
    if (preparedUrl !== imageUrl) URL.revokeObjectURL(preparedUrl);
  }
}

async function loadPdfDocument(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  const arrayBuffer = await file.arrayBuffer();
  return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
}

/** Native PDF text (digital invoices) — far more reliable than OCR. */
async function extractPdfNativeText(pdf) {
  let combined = '';
  for (let p = 1; p <= Math.min(2, pdf.numPages); p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    combined += `${pageText}\n`;
  }
  return combined;
}

async function ocrPdfPages(pdf) {
  let combined = '';
  for (let p = 1; p <= Math.min(2, pdf.numPages); p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const blobUrl = URL.createObjectURL(
      await new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', 0.92))
    );
    try {
      combined += `\n${await ocrImageUrl(blobUrl)}`;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }
  return combined;
}

async function extractPdfText(file) {
  const pdf = await loadPdfDocument(file);
  const native = await extractPdfNativeText(pdf);
  if (native.replace(/\s/g, '').length >= 40) return native;
  return ocrPdfPages(pdf);
}

export async function parseReceiptFile(file, brands = ['NGK', 'NTK', 'KYB']) {
  if (!file) return fieldsFromText('', brands);

  let text = '';
  if (file.type === 'application/pdf') {
    text = await extractPdfText(file);
  } else if (file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    try {
      const barcodeText = await decodeBarcodeFromUrl(url);
      const ocrText = await ocrImageUrl(url);
      return fieldsFromText(ocrText, brands, { barcodeText });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return fieldsFromText(text, brands);
}

function fieldsFromText(text, brands, { barcodeText = null } = {}) {
  const normalized = normalizeOcrText(text);
  const taxInvoice = isRepcoTaxInvoice(normalized);
  const invoiceNumber = extractInvoiceNumber(normalized, { barcodeText });
  const { iso, display, time, timeOnReceipt } = extractDateTime(normalized);
  const storeName = extractStoreName(normalized);
  const eligible = extractEligiblePurchase(normalized, brands);
  const invoiceTotal = extractTotalAmount(normalized) || eligible.invoiceTotal || null;
  const spendAmount = resolveSpendAmount(eligible, invoiceTotal, taxInvoice);

  const fields = {
    invoiceNumber,
    storeName,
    storeCode: invoiceNumber ? deriveStoreCodeFromInvoice(invoiceNumber) : null,
    purchaseDate: iso,
    purchaseDateDisplay: display,
    purchaseTime: time,
    timeOnReceipt,
    taxInvoice,
    spendAmount,
    spendConfidence: eligible.confidence,
    invoiceTotal,
    productDescription: eligible.productDescription,
    detectedBrand: eligible.detectedBrand,
    lineItems: eligible.lineItems,
  };

  const assessment = buildReadAssessment(fields, { requireTime: timeOnReceipt });
  return { ...fields, ...assessment, rawText: normalized };
}
