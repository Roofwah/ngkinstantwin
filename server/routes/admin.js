const express = require('express');
const router = express.Router();
const db = require('../db');
const { adminAuth } = require('../middleware/auth');
const { generateManifest } = require('../services/manifestGenerator');
const audit = require('../services/auditLogger');

router.use(adminAuth);

// GET /api/admin/stats
router.get('/stats', (req, res) => {
  const total       = db.prepare("SELECT COUNT(*) as c FROM claims").get().c;
  const eligible    = db.prepare("SELECT COUNT(*) as c FROM claims WHERE claimStatus != 'CREATED'").get().c;
  const instant     = db.prepare("SELECT COUNT(*) as c FROM claims WHERE result = 'TIER_1_INSTANT_WIN'").get().c;
  const provisional = db.prepare("SELECT COUNT(*) as c FROM claims WHERE claimStatus = 'VALIDATION_PENDING'").get().c;
  const validated   = db.prepare("SELECT COUNT(*) as c FROM claims WHERE claimStatus = 'VALIDATED'").get().c;
  const rejected    = db.prepare("SELECT COUNT(*) as c FROM claims WHERE claimStatus = 'REJECTED'").get().c;
  const remaining   = db.prepare("SELECT COUNT(*) as c FROM manifest WHERE status = 'AVAILABLE'").get().c;
  const totalPrizes = db.prepare("SELECT COUNT(*) as c FROM manifest").get().c;
  const manifestAge = db.prepare("SELECT MIN(createdAt) as t FROM manifest").get().t;

  res.json({
    totalClaims: total,
    eligibleClaims: eligible,
    instantPrizes: instant,
    provisionalPending: provisional,
    validatedClaims: validated,
    rejectedClaims: rejected,
    remainingPrizes: remaining,
    totalPrizes,
    manifestAge,
    demoMode: process.env.DEMO_MODE === 'true',
    seed: process.env.MOCK_SEED || '00000000000000000001f4a9c8b7e6d9mockseed',
  });
});

// GET /api/admin/claims
router.get('/claims', (req, res) => {
  const claims = db.prepare('SELECT * FROM claims ORDER BY createdAt DESC').all();
  res.json(claims);
});

// GET /api/admin/manifest
router.get('/manifest', (req, res) => {
  const manifest = db.prepare('SELECT * FROM manifest ORDER BY winningTimestamp ASC').all();
  res.json(manifest);
});

// GET /api/admin/audit
router.get('/audit', (req, res) => {
  const logs = db.prepare(
    'SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 500'
  ).all();
  res.json(logs);
});

// POST /api/admin/generate-manifest
router.post('/generate-manifest', (req, res) => {
  const seed = process.env.MOCK_SEED || '00000000000000000001f4a9c8b7e6d9mockseed';
  const windowHours = Math.max(1, Math.min(168, parseInt(req.body.windowHours) || 24));

  const prizes = generateManifest(seed, windowHours);

  audit.log('MANIFEST_GENERATED', {
    details: { seed, prizeCount: prizes.length, windowHours },
  });

  res.json({ success: true, prizeCount: prizes.length });
});

// POST /api/admin/reconcile — validate or reject a Tier 2/3 provisional claim
router.post('/reconcile', (req, res) => {
  const { claimId, action, adminNote } = req.body;

  if (!claimId || !action) return res.status(400).json({ error: 'claimId and action required' });
  if (!['VALIDATE', 'REJECT'].includes(action))
    return res.status(400).json({ error: 'action must be VALIDATE or REJECT' });

  const claim = db.prepare('SELECT * FROM claims WHERE claimId = ?').get(claimId);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  if (claim.claimStatus !== 'VALIDATION_PENDING')
    return res.status(400).json({ error: 'Claim is not pending validation' });

  const now = Date.now();

  if (action === 'VALIDATE') {
    db.prepare(`
      UPDATE claims SET claimStatus = 'VALIDATED', validatedAt = ?, adminNote = ? WHERE claimId = ?
    `).run(now, adminNote || null, claimId);
    audit.log('CLAIM_VALIDATED', { claimId, prizeId: claim.prizeId || undefined, details: { adminNote } });
  } else {
    // Void the prize so it can no longer be re-assigned
    if (claim.prizeId) {
      db.prepare("UPDATE manifest SET status = 'VOIDED' WHERE prizeId = ?").run(claim.prizeId);
    }
    db.prepare(`
      UPDATE claims SET claimStatus = 'REJECTED', validatedAt = ?, adminNote = ? WHERE claimId = ?
    `).run(now, adminNote || null, claimId);
    audit.log('CLAIM_REJECTED', { claimId, prizeId: claim.prizeId || undefined, details: { adminNote } });
  }

  res.json({ success: true });
});

module.exports = router;
