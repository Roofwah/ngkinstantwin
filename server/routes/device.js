const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { log } = require('../services/auditLogger');
const { assignPrize } = require('../services/prizeEngine');
const { getBaseUrl } = require('../lib/baseUrl');

const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes — token stays claimable after device returns home

function generateToken() {
  const bytes = crypto.randomBytes(6);
  return 'PR-' + bytes.toString('hex').toUpperCase().slice(0, 8);
}

// POST /api/device/issue-token
router.post('/issue-token', (req, res) => {
  const { deviceCode } = req.body;
  if (!deviceCode) return res.status(400).json({ error: 'deviceCode required' });

  const device = db.prepare('SELECT * FROM devices WHERE deviceCode = ? AND status = ?').get(deviceCode, 'active');
  if (!device) return res.status(404).json({ error: 'Device not found or inactive' });

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ? AND status = ?').get(device.campaignId, 'active');
  if (!campaign) return res.status(404).json({ error: 'No active campaign for this device' });

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
    details: { token, deviceCode, campaignId: campaign.id, storeCode: device.storeCode },
  });

  const baseUrl = getBaseUrl();

  res.json({
    token,
    url: `${baseUrl}/t/${token}`,
    expiresAt: new Date(expiresAt).toISOString(),
    campaign: { id: campaign.id, name: campaign.name, brand: campaign.brand, tagline: campaign.tagline, mechanic: campaign.mechanic },
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

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(record.campaignId);
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

// POST /api/device/claim — create a claim from a validated token (after OTP verified)
router.post('/claim', (req, res) => {
  try {
    const { tokenId, mobile, customerName, spendAmount, selectedBrand } = req.body;
    if (!tokenId || !mobile) return res.status(400).json({ error: 'tokenId and mobile required' });

    const normMobile = (() => {
      const s = (mobile || '').replace(/[\s\-()]/g, '');
      if (/^\+614/.test(s)) return '0' + s.slice(3);
      return s;
    })();
    if (!/^04\d{8}$/.test(normMobile)) return res.status(400).json({ error: 'Invalid mobile number' });

    const spend = parseFloat(spendAmount) || 0;
    if (!['NGK', 'NTK', 'KYB'].includes(selectedBrand))
      return res.status(400).json({ error: 'Invalid brand' });

    const record = db.prepare('SELECT * FROM issued_tokens WHERE id = ?').get(tokenId);
    if (!record) return res.status(404).json({ error: 'Token not found' });
    if (record.status === 'redeemed') return res.status(410).json({ error: 'Token already redeemed' });
    if (record.status === 'void') return res.status(410).json({ error: 'Token has been voided' });
    if (record.status === 'expired' || Date.now() > record.expiresAt)
      return res.status(410).json({ error: 'Token has expired' });

    const claimId = uuidv4();
    const now = Date.now();

    db.prepare(`
      INSERT INTO claims
        (claimId, mobile, receiptNumber, receiptFilename, spendAmount, selectedBrand,
         termsAccepted, result, claimStatus, createdAt, ipAddress, customerName)
      VALUES (?, ?, ?, NULL, ?, ?, 1, 'NOT_WINNER', 'ELIGIBLE', ?, ?, ?)
    `).run(claimId, normMobile, record.token, spend, selectedBrand, now, req.ip || '', customerName || null);

    const { result, prize } = assignPrize(claimId, now);

    let claimStatus = 'ELIGIBLE';
    if (result === 'TIER_1_INSTANT_WIN') claimStatus = 'VALIDATED';
    else if (result === 'TIER_2_PROVISIONAL_WIN' || result === 'TIER_3_PROVISIONAL_WIN')
      claimStatus = 'VALIDATION_PENDING';

    db.prepare('UPDATE claims SET result = ?, claimStatus = ?, prizeId = ?, prizeName = ? WHERE claimId = ?')
      .run(result, claimStatus, prize?.prizeId || null, prize?.prizeName || null, claimId);

    db.prepare('UPDATE issued_tokens SET status = ?, redeemedAt = ?, claimId = ? WHERE id = ?')
      .run('redeemed', now, claimId, tokenId);

    log('device_token_redeemed', {
      claimId,
      details: { tokenId, token: record.token, mobile: normMobile.slice(0, 4) + '****', result, selectedBrand, spendAmount: spend },
    });

    res.json({ claimId, success: true });
  } catch (err) {
    console.error('Token claim error:', err);
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'This token has already been used.' });
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
