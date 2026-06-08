const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');

const upload = multer({ dest: '/tmp/scans/' });

// POST /api/scan — placeholder, returns null (manual entry fallback)
router.post('/', upload.single('image'), async (req, res) => {
  if (req.file) fs.unlink(req.file.path, () => {});
  res.json({ code: null });
});

module.exports = router;
