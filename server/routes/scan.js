const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createWorker } = require('tesseract.js');
const fs = require('fs');

const upload = multer({ dest: '/tmp/scans/' });

async function extractInvoiceNumber(filePath) {
  const worker = await createWorker('eng');
  try {
    const { data: { text } } = await worker.recognize(filePath);
    console.log('[scan] OCR text:', text.replace(/\n/g, ' ').slice(0, 200));

    // Look for "INVOICE NO" or "TRANSACTION" followed by a number
    const labeled = text.match(/(?:invoice\s*no[:\s#]*|transaction[:\s#]*)(\d{6,})/i);
    if (labeled) return labeled[1];

    // Fallback: find all 6+ digit sequences, return the longest
    const numbers = text.match(/\d{6,}/g);
    if (numbers) return numbers.sort((a, b) => b.length - a.length)[0];

    return null;
  } finally {
    await worker.terminate();
  }
}

// POST /api/scan
router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });
  try {
    const code = await extractInvoiceNumber(req.file.path);
    console.log('[scan] result:', code);
    res.json({ code });
  } catch (err) {
    console.error('[scan] error:', err.message);
    res.json({ code: null });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

module.exports = router;
