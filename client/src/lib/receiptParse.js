import { BrowserMultiFormatReader } from '@zxing/browser';

const BRAND_PATTERN = /\b(NGK|NTK|KYB)\b/i;

/** Extract 10-digit Repco-style invoice number from OCR or barcode text. */
export function extractInvoiceNumber(text) {
  if (!text) return null;
  const labelled = text.match(/INVOICE\s*(?:NUMBER)?\s*:?\s*(\d{10})/i);
  if (labelled) return labelled[1];
  const ten = text.replace(/\D/g, '').match(/\d{10}/);
  return ten ? ten[0] : null;
}

/** Parse DATE line → { iso, display, time } */
export function extractDateTime(text) {
  if (!text) return { iso: null, display: null, time: null };
  const m = text.match(/DATE\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+TIME\s*:?\s*(\d{1,2}:\d{2}))?/i);
  if (!m) return { iso: null, display: null, time: null };
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  const yy = m[3];
  const year = yy.length === 2 ? `20${yy}` : yy;
  const time = m[4] || extractTimeFallback(text);
  return {
    iso: `${year}-${mm}-${dd}`,
    display: `${dd}/${mm}/${year}`,
    time,
  };
}

function extractTimeFallback(text) {
  const m = text.match(/TIME\s*:?\s*(\d{1,2}:\d{2})/i);
  return m ? m[1] : null;
}

/** Repco store suburb/location from header lines. */
export function extractStoreName(text) {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^REPCO\b/i.test(line)) continue;
    const suburb = line.match(/^([A-Z][A-Z\s'-]{2,30})\s+PH\b/i);
    if (suburb) return titleCase(suburb[1].trim());
    const afterRepco = line.match(/REPCO[^A-Z]*([A-Z][A-Z\s'-]{2,28})/i);
    if (afterRepco && !/DIV|GPC|ASIA|PACIFIC/i.test(afterRepco[1])) {
      return titleCase(afterRepco[1].trim());
    }
  }
  const marooch = text.match(/\b(MAROOCHYDORE|BRISBANE|SYDNEY|MELBOURNE|PERTH|ADELAIDE|CAIRNS|TOOWOOMBA)\b/i);
  if (marooch) return titleCase(marooch[1]);
  return null;
}

function titleCase(s) {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export function extractTotalAmount(text) {
  if (!text) return null;
  const m = text.match(/TOTAL\s*:?\s*\$?\s*([\d]+(?:\.\d{1,2})?)/i);
  return m ? m[1] : null;
}

/** Line items with trailing unit price (Repco thermal layout). */
export function extractLineItems(text) {
  if (!text) return [];
  const items = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || /^(TOTAL|GST|ROUNDING|CHANGE|SUB|BALANCE|ANZ|EFTPOS|REPCO|INVOICE|DATE|ABN|TAX)/i.test(line)) {
      continue;
    }
    const m = line.match(/^(.+?)\s+\d+\s+(\d+\.\d{2})\s*$/);
    if (m) {
      items.push({ description: m[1].trim(), amount: parseFloat(m[2]) });
      continue;
    }
    const tail = line.match(/^(.+?)\s+(\d+\.\d{2})\s*$/);
    if (tail && !/^\d/.test(tail[1])) {
      items.push({ description: tail[1].trim(), amount: parseFloat(tail[2]) });
    }
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
  const productLines = items.filter(i => i.amount > 0 && i.amount < 500);
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
  return {
    spendAmount: null,
    detectedBrand: null,
    productDescription: productLines.map(i => i.description).join('; ') || null,
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
  purchaseTime: 'The TIME: next to the date must be readable.',
  spendAmount: 'We couldn\'t match an NGK, NTK or KYB line item. Confirm the eligible product line is visible, or enter the amount for qualifying products only (not the invoice total if it includes other items).',
};

export function buildReadAssessment(fields) {
  const read = {};
  const missing = [];
  const issues = [];

  const checks = [
    ['invoiceNumber', fields.invoiceNumber],
    ['storeName', fields.storeName],
    ['purchaseDate', fields.purchaseDateDisplay],
    ['purchaseTime', fields.purchaseTime],
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

async function ocrImageUrl(imageUrl) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, { logger: () => {} });
  try {
    const { data: { text } } = await worker.recognize(imageUrl);
    return text;
  } finally {
    await worker.terminate();
  }
}

async function ocrPdfFile(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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

export async function parseReceiptFile(file, brands = ['NGK', 'NTK', 'KYB']) {
  if (!file) return fieldsFromText('', brands);

  let text = '';
  if (file.type === 'application/pdf') {
    text = await ocrPdfFile(file);
  } else if (file.type.startsWith('image/')) {
    const url = URL.createObjectURL(file);
    try {
      const barcodeText = await decodeBarcodeFromUrl(url);
      const ocrText = await ocrImageUrl(url);
      text = `${barcodeText || ''}\n${ocrText || ''}`;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return fieldsFromText(text, brands);
}

function fieldsFromText(text, brands) {
  const invoiceNumber = extractInvoiceNumber(text);
  const { iso, display, time } = extractDateTime(text);
  const storeName = extractStoreName(text);
  const eligible = extractEligiblePurchase(text, brands);
  const invoiceTotal = extractTotalAmount(text);

  const fields = {
    invoiceNumber,
    storeName,
    storeCode: invoiceNumber ? deriveStoreCodeFromInvoice(invoiceNumber) : null,
    purchaseDate: iso,
    purchaseDateDisplay: display,
    purchaseTime: time,
    spendAmount: eligible.spendAmount,
    spendConfidence: eligible.confidence,
    invoiceTotal: invoiceTotal || (eligible.invoiceTotal ?? null),
    productDescription: eligible.productDescription,
    detectedBrand: eligible.detectedBrand,
    lineItems: eligible.lineItems,
  };

  const assessment = buildReadAssessment(fields);
  return { ...fields, ...assessment, rawText: text };
}
