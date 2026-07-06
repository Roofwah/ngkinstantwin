import { BrowserMultiFormatReader } from '@zxing/browser';

/** Extract 10-digit Repco-style invoice number from OCR or barcode text. */
export function extractInvoiceNumber(text) {
  if (!text) return null;
  const labelled = text.match(/INVOICE\s*:?\s*(\d{10})/i);
  if (labelled) return labelled[1];
  const digits = text.replace(/\D/g, '');
  const ten = digits.match(/\d{10}/);
  return ten ? ten[0] : null;
}

/** Parse DD/MM/YY or DD/MM/YYYY after DATE: label → YYYY-MM-DD. */
export function extractPurchaseDate(text) {
  if (!text) return null;
  const m = text.match(/DATE\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
  if (!m) return null;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  const yy = m[3];
  const year = yy.length === 2 ? `20${yy}` : yy;
  return `${year}-${mm}-${dd}`;
}

/** Parse TOTAL line amount. */
export function extractTotalAmount(text) {
  if (!text) return null;
  const m = text.match(/TOTAL\s*:?\s*\$?\s*([\d]+(?:\.\d{1,2})?)/i);
  return m ? m[1] : null;
}

export function deriveStoreCodeFromInvoice(invoiceNumber) {
  const digits = String(invoiceNumber || '').replace(/\D/g, '');
  return digits.length >= 3 ? digits.slice(0, 3) : '';
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

/**
 * Best-effort parse of a receipt image or PDF (no server OCR).
 * Returns fields to pre-fill the form; user can always edit.
 */
export async function parseReceiptFile(file) {
  if (!file) return {};

  if (file.type === 'application/pdf') {
    const text = await ocrPdfFile(file);
    return fieldsFromText(text);
  }

  if (!file.type.startsWith('image/')) {
    return {};
  }

  const url = URL.createObjectURL(file);
  try {
    const barcodeText = await decodeBarcodeFromUrl(url);
    const ocrText = await ocrImageUrl(url);
    const combined = `${barcodeText || ''}\n${ocrText || ''}`;
    return fieldsFromText(combined);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fieldsFromText(text) {
  const invoiceNumber = extractInvoiceNumber(text);
  const purchaseDate = extractPurchaseDate(text);
  const spendAmount = extractTotalAmount(text);
  return {
    invoiceNumber,
    purchaseDate,
    spendAmount,
    storeCode: invoiceNumber ? deriveStoreCodeFromInvoice(invoiceNumber) : null,
  };
}
