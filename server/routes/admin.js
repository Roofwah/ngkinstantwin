const express = require('express');
const router = express.Router();
const db = require('../db');
const { adminAuth } = require('../middleware/auth');
const { generateManifest } = require('../services/manifestGenerator');
const { listDemoCampaigns, DEFAULT_CAMPAIGN_ID } = require('../services/demoCampaign');
const {
  getDemoControlStatus,
  saveDemoControl,
  resetSequence,
} = require('../services/demoControl');
const audit = require('../services/auditLogger');

router.use(adminAuth);

function resolveAdminCampaignId(req) {
  return req.query.campaignId || req.body?.campaignId || DEFAULT_CAMPAIGN_ID;
}

function claimFilter(campaignId) {
  if (campaignId === DEFAULT_CAMPAIGN_ID) {
    return {
      sql: '(campaignId = ? OR campaignId IS NULL OR campaignId = \'\')',
      params: [campaignId],
    };
  }
  return { sql: 'campaignId = ?', params: [campaignId] };
}

router.get('/campaigns', (req, res) => {
  res.json({
    campaigns: listDemoCampaigns(db),
    defaultCampaignId: DEFAULT_CAMPAIGN_ID,
  });
});

router.get('/stats', (req, res) => {
  const campaignId = resolveAdminCampaignId(req);
  const claims = claimFilter(campaignId);

  const total = db.prepare(`SELECT COUNT(*) as c FROM claims WHERE ${claims.sql}`).get(...claims.params).c;
  const eligible = db.prepare(`SELECT COUNT(*) as c FROM claims WHERE claimStatus != 'CREATED' AND ${claims.sql}`).get(...claims.params).c;
  const instant = db.prepare(`SELECT COUNT(*) as c FROM claims WHERE result = 'TIER_1_INSTANT_WIN' AND ${claims.sql}`).get(...claims.params).c;
  const provisional = db.prepare(`SELECT COUNT(*) as c FROM claims WHERE claimStatus = 'VALIDATION_PENDING' AND ${claims.sql}`).get(...claims.params).c;
  const validated = db.prepare(`SELECT COUNT(*) as c FROM claims WHERE claimStatus = 'VALIDATED' AND ${claims.sql}`).get(...claims.params).c;
  const rejected = db.prepare(`SELECT COUNT(*) as c FROM claims WHERE claimStatus = 'REJECTED' AND ${claims.sql}`).get(...claims.params).c;
  const remaining = db.prepare("SELECT COUNT(*) as c FROM manifest WHERE status = 'AVAILABLE' AND campaignId = ?").get(campaignId).c;
  const totalPrizes = db.prepare('SELECT COUNT(*) as c FROM manifest WHERE campaignId = ?').get(campaignId).c;
  const manifestAge = db.prepare('SELECT MIN(createdAt) as t FROM manifest WHERE campaignId = ?').get(campaignId).t;
  const campaign = db.prepare('SELECT id, name, brand FROM campaigns WHERE id = ?').get(campaignId);
  const demoControl = getDemoControlStatus(campaignId);

  res.json({
    campaignId,
    campaign,
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
    demoControl,
  });
});

router.get('/claims', (req, res) => {
  const campaignId = resolveAdminCampaignId(req);
  const claims = claimFilter(campaignId);
  const rows = db.prepare(`SELECT * FROM claims WHERE ${claims.sql} ORDER BY createdAt DESC`).all(...claims.params);
  res.json(rows);
});

router.get('/manifest', (req, res) => {
  const campaignId = resolveAdminCampaignId(req);
  const manifest = db.prepare('SELECT * FROM manifest WHERE campaignId = ? ORDER BY winningTimestamp ASC').all(campaignId);
  res.json(manifest);
});

router.get('/audit', (req, res) => {
  const campaignId = resolveAdminCampaignId(req);
  const logs = db.prepare(`
    SELECT a.* FROM audit_log a
    LEFT JOIN claims c ON c.claimId = a.claimId
    WHERE a.claimId IS NULL
       OR ${campaignId === DEFAULT_CAMPAIGN_ID
         ? "(c.campaignId = ? OR c.campaignId IS NULL OR c.campaignId = '')"
         : 'c.campaignId = ?'}
    ORDER BY a.timestamp DESC
    LIMIT 500
  `).all(campaignId);
  res.json(logs);
});

router.post('/generate-manifest', (req, res) => {
  const campaignId = resolveAdminCampaignId(req);
  const seed = process.env.MOCK_SEED || '00000000000000000001f4a9c8b7e6d9mockseed';
  const windowHours = Math.max(1, Math.min(168, parseInt(req.body.windowHours) || 24));

  const prizes = generateManifest(seed, windowHours, campaignId);

  audit.log('MANIFEST_GENERATED', {
    details: { seed, prizeCount: prizes.length, windowHours, campaignId },
  });

  res.json({ success: true, prizeCount: prizes.length, campaignId });
});

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

router.get('/demo-control', (req, res) => {
  const campaignId = resolveAdminCampaignId(req);
  res.json(getDemoControlStatus(campaignId));
});

router.put('/demo-control', (req, res) => {
  const campaignId = resolveAdminCampaignId(req);
  try {
    const saved = saveDemoControl(campaignId, req.body || {});
    audit.log('DEMO_CONTROL_UPDATED', {
      details: {
        campaignId,
        winEvery: saved.winEvery,
        prizeCount: saved.prizes.length,
        loaded: saved.loaded,
      },
    });
    res.json(getDemoControlStatus(campaignId));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.post('/demo-control/reset-sequence', (req, res) => {
  const campaignId = resolveAdminCampaignId(req);
  try {
    const status = resetSequence(campaignId);
    audit.log('DEMO_SEQUENCE_RESET', { details: { campaignId, claimOffset: status.claimOffset } });
    res.json(status);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

module.exports = router;
