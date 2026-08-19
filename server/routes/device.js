const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { log } = require('../services/auditLogger');
const { getBaseUrl } = require('../lib/baseUrl');
const {
  resolveCampaignId,
  loadCampaign,
  setActiveDemoCampaignId,
  listDemoCampaigns,
  isDemoDevice,
} = require('../services/demoCampaign');
const { receiptUpload } = require('../lib/receiptUpload');
const { createClaimWithReceipt } = require('../services/deviceClaim');
const { advanceSession, attachClaimToSession } = require('../services/labSession');

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes — token stays claimable after device returns home

function generateToken() {
  const bytes = crypto.randomBytes(6);
  return 'PR-' + bytes.toString('hex').toUpperCase().slice(0, 8);
}

function getDevice(deviceCode) {
  return db.prepare('SELECT * FROM devices WHERE deviceCode = ? AND status = ?').get(deviceCode, 'active');
}

function buildConfigResponse(deviceCode) {
  const device = getDevice(deviceCode);
  if (!device) return null;

  const campaignId = resolveCampaignId(db, device);
  const campaign = loadCampaign(db, campaignId);
  if (!campaign) return null;

  return {
    deviceCode: device.deviceCode,
    device: {
      deviceCode: device.deviceCode,
      name: device.name,
      storeName: device.storeName,
      retailer: device.retailer,
      storeCode: device.storeCode,
    },
    campaign,
    canIssueToken: true,
    demoMode: process.env.DEMO_MODE === 'true',
    availableCampaigns: listDemoCampaigns(db),
  };
}

// GET /api/device/sync?deviceCode=PR-DEMO-001 — campaign package for OTA slide download
router.get('/sync', (req, res) => {
  const deviceCode = req.query.deviceCode;
  if (!deviceCode) return res.status(400).json({ error: 'deviceCode required' });

  const device = getDevice(deviceCode);
  if (!device) return res.status(404).json({ error: 'Device not found or inactive' });

  const campaignId = resolveCampaignId(db, device);
  const campaign = loadCampaign(db, campaignId);
  if (!campaign) return res.status(404).json({ error: 'No active campaign' });

  const { buildCampaignPackage } = require('../services/campaignPackage');
  const pkg = buildCampaignPackage(campaign);
  if (!pkg) {
    return res.status(404).json({
      error: 'Campaign package not published',
      campaignId,
      hint: 'Add JPEGs under server/public/campaign-packages/<campaignId>/slide1.jpg …',
    });
  }

  res.json({
    deviceCode,
    package: pkg,
    demoQrPath: '/demo/device',
    serverTime: new Date().toISOString(),
  });
});

// GET /api/device/config?deviceCode=PR-DEMO-001
router.get('/config', (req, res) => {
  const deviceCode = req.query.deviceCode;
  if (!deviceCode) return res.status(400).json({ error: 'deviceCode required' });

  const payload = buildConfigResponse(deviceCode);
  if (!payload) return res.status(404).json({ error: 'Device not found or no active campaign' });

  res.json(payload);
});

// GET /api/device/active-campaign?deviceCode=PR-DEMO-001 — tiny payload for PUK polling
router.get('/active-campaign', (req, res) => {
  const deviceCode = req.query.deviceCode;
  if (!deviceCode) return res.status(400).json({ error: 'deviceCode required' });

  const device = getDevice(deviceCode);
  if (!device) return res.status(404).json({ error: 'Device not found or inactive' });

  const campaignId = resolveCampaignId(db, device);
  const campaign = loadCampaign(db, campaignId);
  if (!campaign) return res.status(404).json({ error: 'No active campaign' });

  res.json({
    deviceCode,
    campaignId: campaign.id,
    campaignName: campaign.name,
  });
});

// PUT /api/device/demo-campaign — set active demo campaign (shared by simulator + physical PUK)
router.put('/demo-campaign', (req, res) => {
  const { campaignId } = req.body;
  if (!campaignId) return res.status(400).json({ error: 'campaignId required' });

  try {
    setActiveDemoCampaignId(db, campaignId);
    log('demo_campaign_switched', { details: { campaignId } });
    const payload = buildConfigResponse('PR-DEMO-001');
    res.json({ ok: true, campaignId, config: payload });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

function resolveIssueCampaignId(device, requestedCampaignId) {
  let campaignId = resolveCampaignId(db, device);
  if (device.deviceCode === 'PR-PUK2-001') {
    return campaignId;
  }
  if (!isDemoDevice(device.deviceCode) || !requestedCampaignId) {
    return campaignId;
  }
  const row = db.prepare('SELECT id FROM campaigns WHERE id = ? AND status = ?').get(requestedCampaignId, 'active');
  return row ? requestedCampaignId : campaignId;
}

// POST /api/device/issue-token
router.post('/issue-token', (req, res) => {
  const { deviceCode, campaignId: requestedCampaignId } = req.body;
  if (!deviceCode) return res.status(400).json({ error: 'deviceCode required' });

  const device = getDevice(deviceCode);
  if (!device) return res.status(404).json({ error: 'Device not found or inactive' });

  const campaignId = resolveIssueCampaignId(device, requestedCampaignId);
  const campaign = loadCampaign(db, campaignId);
  if (!campaign || campaign.status !== 'active') {
    return res.status(404).json({ error: 'No active campaign for this device' });
  }

  const token = generateToken();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const id = uuidv4();
  const issuedAt = Date.now();
  const expiresAt = issuedAt + TOKEN_TTL_MS;

  db.prepare(`
    INSERT INTO issued_tokens (id, token, tokenHash, campaignId, deviceId, storeCode, issuedAt, expiresAt, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'issued')
  `).run(id, token, tokenHash, campaign.id, device.id, device.storeCode, issuedAt, expiresAt);

  log('device_token_issued', {
    details: { token, deviceCode, campaignId: campaign.id, storeCode: device.storeCode, demo: isDemoDevice(deviceCode) },
  });

  const baseUrl = getBaseUrl();

  res.json({
    token,
    url: `${baseUrl}/t/${token}`,
    expiresAt: new Date(expiresAt).toISOString(),
    campaign,
    device: { deviceCode: device.deviceCode, name: device.name, storeName: device.storeName, retailer: device.retailer },
  });
});

// GET /api/device/token/:token — validate and mark scanned
router.get('/token/:token', (req, res) => {
  const { token } = req.params;
  const record = db.prepare('SELECT * FROM issued_tokens WHERE token = ?').get(token);

  if (!record) return res.status(404).json({ error: 'Token not found' });
  if (record.status === 'void') return res.status(410).json({ error: 'Token has been voided' });
  if (record.status === 'redeemed') return res.status(410).json({ error: 'Token already redeemed' });
  if (Date.now() > record.expiresAt) {
    db.prepare('UPDATE issued_tokens SET status = ? WHERE token = ?').run('expired', token);
    return res.status(410).json({ error: 'Token has expired' });
  }

  if (record.status === 'issued') {
    db.prepare('UPDATE issued_tokens SET status = ?, scannedAt = ? WHERE token = ?')
      .run('scanned', Date.now(), token);
    log('device_token_scanned', { details: { token, deviceId: record.deviceId } });
  }

  const campaign = loadCampaign(db, record.campaignId);
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(record.deviceId);

  res.json({
    tokenId: record.id,
    token: record.token,
    status: record.status === 'issued' ? 'scanned' : record.status,
    expiresAt: new Date(record.expiresAt).toISOString(),
    campaign,
    device: { deviceCode: device.deviceCode, storeName: device.storeName, retailer: device.retailer },
  });
});

// GET /api/device/token-status/:token — poll for scanned/redeemed status (device polls this)
router.get('/token-status/:token', (req, res) => {
  const record = db.prepare('SELECT status, scannedAt, redeemedAt, expiresAt FROM issued_tokens WHERE token = ?').get(req.params.token);
  if (!record) return res.status(404).json({ error: 'Not found' });
  if (Date.now() > record.expiresAt && record.status === 'issued') {
    db.prepare('UPDATE issued_tokens SET status = ? WHERE token = ?').run('expired', req.params.token);
    return res.json({ status: 'expired' });
  }
  res.json({ status: record.status, scannedAt: record.scannedAt, redeemedAt: record.redeemedAt });
});

// POST /api/device/direct-claim — instant win without a PUK token (multipart + receipt)
router.post('/direct-claim', receiptUpload.single('receipt'), (req, res) => {
  try {
    const deviceCode = req.body.deviceCode || 'PR-DEMO-001';
    const { mobile, campaignId: bodyCampaignId, labSessionId } = req.body;

    if (!mobile) return res.status(400).json({ error: 'mobile required' });

    const device = getDevice(deviceCode);
    if (!device) return res.status(404).json({ error: 'Device not found or inactive' });

    const resolvedCampaignId = bodyCampaignId || resolveCampaignId(db, device);
    const campaign = loadCampaign(db, resolvedCampaignId);
    if (!campaign || campaign.status !== 'active') {
      return res.status(404).json({ error: 'No active campaign' });
    }

    const outcome = createClaimWithReceipt({
      mobile,
      body: req.body,
      file: req.file,
      ipAddress: req.ip,
      campaign,
      deviceCode,
      campaignId: resolvedCampaignId,
    });

    if (outcome.error) {
      return res.status(outcome.status || 400).json({
        error: outcome.error,
        errors: outcome.errors,
      });
    }

    if (labSessionId) {
      advanceSession(labSessionId, 'checking_instant_win');
      attachClaimToSession(labSessionId, outcome.claimId);
    }

    const claim = db.prepare(
      'SELECT result, prizeName, redemptionCode FROM claims WHERE claimId = ?'
    ).get(outcome.claimId);

    res.json({
      claimId: outcome.claimId,
      success: true,
      result: claim?.result || null,
      prizeName: claim?.prizeName || null,
      redemptionCode: claim?.redemptionCode || null,
    });
  } catch (err) {
    console.error('Direct claim error:', err);
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'This invoice number has already been used.' });
    }
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/device/claim — create a claim from a validated token (multipart + receipt)
router.post('/claim', receiptUpload.single('receipt'), (req, res) => {
  try {
    const { tokenId, mobile } = req.body;
    if (!tokenId || !mobile) return res.status(400).json({ error: 'tokenId and mobile required' });

    const record = db.prepare('SELECT * FROM issued_tokens WHERE id = ?').get(tokenId);
    if (!record) return res.status(404).json({ error: 'Token not found' });
    if (record.status === 'redeemed') return res.status(410).json({ error: 'Token already redeemed' });
    if (record.status === 'void') return res.status(410).json({ error: 'Token has been voided' });
    if (record.status === 'expired' || Date.now() > record.expiresAt) {
      return res.status(410).json({ error: 'Token has expired' });
    }

    const campaign = loadCampaign(db, record.campaignId);
    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(record.deviceId);

    const outcome = createClaimWithReceipt({
      mobile,
      body: req.body,
      file: req.file,
      ipAddress: req.ip,
      campaign,
      deviceCode: device?.deviceCode,
      campaignId: record.campaignId,
      tokenId,
      tokenRecord: record,
    });

    if (outcome.error) {
      return res.status(outcome.status || 400).json({
        error: outcome.error,
        errors: outcome.errors,
      });
    }

    const claim = db.prepare(
      'SELECT result, prizeName, redemptionCode FROM claims WHERE claimId = ?'
    ).get(outcome.claimId);

    res.json({
      claimId: outcome.claimId,
      success: true,
      result: claim?.result || null,
      prizeName: claim?.prizeName || null,
      redemptionCode: claim?.redemptionCode || null,
    });
  } catch (err) {
    console.error('Token claim error:', err);
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'This invoice number has already been used.' });
    }
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/device/stats — token counts for the data panel
router.get('/stats', (req, res) => {
  try {
    const row = db.prepare(`
      SELECT
        COUNT(*)                                          AS issued,
        SUM(CASE WHEN status = 'scanned'  THEN 1 ELSE 0 END) AS scanned,
        SUM(CASE WHEN status = 'redeemed' THEN 1 ELSE 0 END) AS redeemed,
        SUM(CASE WHEN status = 'expired'  THEN 1 ELSE 0 END) AS expired
      FROM issued_tokens
    `).get();
    res.json({
      issued:   row.issued   ?? 0,
      scanned:  row.scanned  ?? 0,
      redeemed: row.redeemed ?? 0,
      expired:  row.expired  ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
