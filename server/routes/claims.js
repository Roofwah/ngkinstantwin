const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { assignPrize } = require('../services/prizeEngine');
const audit = require('../services/auditLogger');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `receipt-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images (JPEG, PNG, GIF, WebP) and PDF files are accepted'));
  },
});

// POST /api/claims — submit a new claim
router.post('/', upload.single('receipt'), (req, res) => {
  try {
    const { mobile, receiptNumber, spendAmount, selectedBrand, termsAccepted } = req.body;
    const errors = [];

    const normMobile = (() => {
      const s = (mobile || '').replace(/[\s\-()]/g, '');
      if (/^\+614/.test(s)) return '0' + s.slice(3);
      return s;
    })();
    if (!normMobile || !/^04\d{8}$/.test(normMobile))
      errors.push('Valid Australian mobile number required (04XX XXX XXX or +61 4XX XXX XXX)');
    if (!receiptNumber || receiptNumber.trim().length < 3)
      errors.push('Receipt number required');
    if (!spendAmount || parseFloat(spendAmount) < 50)
      errors.push('Minimum purchase of $50.00 required');
    if (!['NGK', 'NTK', 'KYB'].includes(selectedBrand))
      errors.push('Selected brand must be NGK, NTK, or KYB');
    if (!termsAccepted || termsAccepted === 'false')
      errors.push('Terms & Conditions must be accepted');
    if (!req.file)
      errors.push('Receipt image or PDF is required');

    if (errors.length) return res.status(400).json({ error: errors[0], errors });

    // Duplicate receipt check
    const dup = db.prepare('SELECT claimId FROM claims WHERE receiptNumber = ?').get(receiptNumber.trim());
    if (dup) return res.status(409).json({ error: 'This receipt number has already been used.' });

    const claimId = uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO claims
        (claimId, mobile, receiptNumber, receiptFilename, spendAmount, selectedBrand,
         termsAccepted, result, claimStatus, createdAt, ipAddress)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'NOT_WINNER', 'CREATED', ?, ?)
    `).run(
      claimId,
      normMobile,
      receiptNumber.trim(),
      req.file ? req.file.filename : null,
      parseFloat(spendAmount),
      selectedBrand,
      1,
      now,
      req.ip,
    );

    audit.log('CLAIM_CREATED', {
      claimId,
      details: { mobile: normMobile.slice(0, 4) + '****', receiptNumber: receiptNumber.trim() },
    });

    // Eligibility is already validated above; mark as eligible
    db.prepare("UPDATE claims SET claimStatus = 'ELIGIBLE' WHERE claimId = ?").run(claimId);
    audit.log('ELIGIBILITY_CHECKED', { claimId, details: { eligible: true } });

    // Determine prize outcome server-side — never exposed before reveal
    const { result, prize } = assignPrize(claimId, now);

    let claimStatus = 'ELIGIBLE';
    if (result === 'TIER_1_INSTANT_WIN') claimStatus = 'VALIDATED';
    else if (result === 'TIER_2_PROVISIONAL_WIN' || result === 'TIER_3_PROVISIONAL_WIN')
      claimStatus = 'VALIDATION_PENDING';

    db.prepare(`
      UPDATE claims SET result = ?, claimStatus = ?, prizeId = ?, prizeName = ? WHERE claimId = ?
    `).run(result, claimStatus, prize?.prizeId || null, prize?.prizeName || null, claimId);

    if (prize) {
      audit.log('PRIZE_ASSIGNED', {
        claimId,
        prizeId: prize.prizeId,
        details: { result, prizeName: prize.prizeName, tier: prize.tier },
      });
    }

    res.json({ claimId, success: true });
  } catch (err) {
    console.error('Claim error:', err);
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'This receipt number has already been used.' });
    }
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/claims/:claimId — fetch claim (no winningTimestamp exposed)
router.get('/:claimId', (req, res) => {
  const claim = db.prepare('SELECT * FROM claims WHERE claimId = ?').get(req.params.claimId);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  const { ipAddress, ...safe } = claim;
  res.json(safe);
});

// POST /api/claims/:claimId/reveal — mark scratch as revealed
router.post('/:claimId/reveal', (req, res) => {
  const claim = db.prepare('SELECT * FROM claims WHERE claimId = ?').get(req.params.claimId);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });

  if (!claim.revealedAt) {
    db.prepare(`
      UPDATE claims
      SET revealedAt = ?,
          claimStatus = CASE WHEN claimStatus = 'ELIGIBLE' THEN 'REVEALED' ELSE claimStatus END
      WHERE claimId = ?
    `).run(Date.now(), req.params.claimId);

    audit.log('SCRATCH_REVEALED', {
      claimId: claim.claimId,
      prizeId: claim.prizeId || undefined,
      details: { result: claim.result },
    });
  }

  const updated = db.prepare('SELECT * FROM claims WHERE claimId = ?').get(req.params.claimId);
  const { ipAddress: _, ...safe } = updated;
  res.json(safe);
});

module.exports = router;
