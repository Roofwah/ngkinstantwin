const express = require('express');
const router = express.Router();
const {
  createSession,
  getSession,
  getSessionReport,
  advanceSession,
  updateSessionRules,
  updateSessionAccessPoint,
} = require('../services/labSession');
const { getLabNetworkHint } = require('../lib/baseUrl');

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
    clientOrigin,
    labConfigId,
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
    clientOrigin,
    labConfigId,
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
