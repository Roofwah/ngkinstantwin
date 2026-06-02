const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

const upload = multer({ dest: '/tmp/scans/' });

async function scanBarcode(filePath) {
  const { scanImageData } = await import('@undecaf/zbar-wasm');
  const img = await loadImage(filePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const results = await scanImageData(imageData);
  return results.length > 0 ? results[0].decode() : null;
}

// POST /api/scan
router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image provided' });
  try {
    const code = await scanBarcode(req.file.path);
    res.json({ code });
  } catch (err) {
    console.error('Scan error:', err.message);
    res.json({ code: null });
  } finally {
    fs.unlink(req.file.path, () => {});
  }
});

module.exports = router;
