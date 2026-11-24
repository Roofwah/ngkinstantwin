const express = require('express');
const router = express.Router();
const {
  createSession,
  getSession,
  getSessionReport,
  advanceSession,
  updateSessionRules,
  updateSessionAccessPoint,
  generateSessionManifest,
} = require('../services/labSession');
const { prizesForCampaign } = require('../services/manifestGenerator');
const { loadCampaign } = require('../services/demoCampaign');
const { buildCampaignDetails } = require('../lib/campaignSchedule');
const { getLabNetworkHint } = require('../lib/baseUrl');
const db = require('../db');

// POST /api/lab/session — start a presentation session
router.post('/session', (req, res) => {
  const {
    campaignId,
    campaignName,
    retailer,
    store,
    accessPointType,
    accessPointId,
    storeId,
    storeLocation,
    deviceCode,
    entryPath,
    clientOrigin,
    labConfigId,
    labMode,
    rules,
  } = req.body || {};

  if (!campaignId) {
    return res.status(400).json({ error: 'campaignId required' });
  }

  const session = createSession({
    campaignId,
    campaignName,
    retailer,
    store,
    accessPointType,
    accessPointId,
    storeId,
    storeLocation,
    deviceCode,
    entryPath,
    clientOrigin,
    labConfigId,
    labMode,
    rules,
  });

  res.status(201).json({
    ...session,
    networkHint: getLabNetworkHint(),
  });
});

// GET /api/lab/network-hint — LAN URL for phone testing in dev
router.get('/network-hint', (req, res) => {
  res.json(getLabNetworkHint() || { note: 'No LAN interface detected' });
});

// GET /api/lab/session/:sessionId
router.get('/session/:sessionId', (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found or expired' });
  res.json(session);
});

// PATCH /api/lab/session/:sessionId/access-point — sync QR / store from campaign config
router.patch('/session/:sessionId/access-point', (req, res) => {
  const { accessPointId, storeId, storeLocation } = req.body || {};
  const session = updateSessionAccessPoint(req.params.sessionId, {
    accessPointId,
    storeId,
    storeLocation,
  });
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// PATCH /api/lab/session/:sessionId/rules — update demo qualifying purchase rules
router.patch('/session/:sessionId/rules', (req, res) => {
  const { minSpend, allowDuplicateReceipts } = req.body || {};
  const session = updateSessionRules(req.params.sessionId, {
    minSpend,
    allowDuplicateReceipts,
  });
  if (!session) {
    return res.status(404).json({ error: 'Session not found or invalid rules' });
  }
  res.json(session);
});

// GET /api/lab/session/:sessionId/report — full entry summary for campaign reporting
router.get('/session/:sessionId/report', (req, res) => {
  const data = getSessionReport(req.params.sessionId);
  if (!data) return res.status(404).json({ error: 'Session not found or expired' });
  res.json(data);
});

// GET /api/lab/campaign-details — dates, winning moments, activation hours for presenter
router.get('/campaign-details', (req, res) => {
  const campaignId = String(req.query.campaignId || 'hoka-2026').trim();
  const campaign = loadCampaign(db, campaignId);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const total = db.prepare('SELECT COUNT(*) as c FROM manifest WHERE campaignId = ?').get(campaignId).c;
  const remaining = db.prepare(
    "SELECT COUNT(*) as c FROM manifest WHERE campaignId = ? AND status = 'AVAILABLE'",
  ).get(campaignId).c;

  res.json(buildCampaignDetails(campaign, { total, remaining }));
});

// GET /api/lab/manifest-info — seed + catalog summary for manifest setup demo
router.get('/manifest-info', (req, res) => {
  const campaignId = String(req.query.campaignId || 'hoka-2026').trim();
  const catalog = prizesForCampaign(campaignId);
  const tier1 = catalog.tier1?.length || 0;
  const tier2 = catalog.tier2?.length || 0;
  const tier3 = catalog.tier3?.length || 0;
  const totalPrizes = db.prepare('SELECT COUNT(*) as c FROM manifest WHERE campaignId = ?').get(campaignId).c;
  const remainingPrizes = db.prepare("SELECT COUNT(*) as c FROM manifest WHERE campaignId = ? AND status = 'AVAILABLE'").get(campaignId).c;
  const manifestAge = db.prepare('SELECT MIN(createdAt) as t FROM manifest WHERE campaignId = ?').get(campaignId).t;

  res.json({
    campaignId,
    seed: process.env.MOCK_SEED || '00000000000000000001f4a9c8b7e6d9mockseed',
    catalog: {
      tier1: catalog.tier1 || [],
      tier2: catalog.tier2 || [],
      tier3: catalog.tier3 || [],
      tier1Count: tier1,
      tier2Count: tier2,
      tier3Count: tier3,
      totalNominated: tier1 + tier2 + tier3,
    },
    totalPrizes,
    remainingPrizes,
    manifestAge,
    demoMode: process.env.DEMO_MODE === 'true',
  });
});

// POST /api/lab/session/:sessionId/generate-manifest — presenter demo (no admin token)
router.post('/session/:sessionId/generate-manifest', (req, res) => {
  const windowHours = Math.max(1, Math.min(168, parseInt(req.body?.windowHours, 10) || 24));
  const session = generateSessionManifest(req.params.sessionId, windowHours);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or not a manifest setup session' });
  }
  res.json(session);
});

// POST /api/lab/session/:sessionId/event — advance presentation stage
router.post('/session/:sessionId/event', (req, res) => {
  const { stage, ...meta } = req.body || {};
  if (!stage) return res.status(400).json({ error: 'stage required' });

  const session = advanceSession(req.params.sessionId, stage, meta);
  if (!session) {
    return res.status(404).json({ error: 'Session not found or invalid stage' });
  }
  res.json(session);
});

module.exports = router;
