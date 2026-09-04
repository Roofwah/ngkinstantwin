const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { getBaseUrl, getPublicBaseUrlWarning } = require('./lib/baseUrl');
const { getOtpMode, hasBirdConfig, birdEnvStatus } = require('./lib/otpMode');
const { resendConfigured } = require('./services/winnerNotify');
const { generateManifest } = require('./services/manifestGenerator');
const { getActiveDemoCampaignId, DEMO_CAMPAIGN_IDS } = require('./services/demoCampaign');
const { usesNthWinDemo, getDemoControl, loadNominatedIntoPool } = require('./services/demoControl');

const seed = process.env.MOCK_SEED || '00000000000000000001f4a9c8b7e6d9mockseed';
for (const campaignId of DEMO_CAMPAIGN_IDS) {
  if (usesNthWinDemo(campaignId)) {
    const n = loadNominatedIntoPool(campaignId, getDemoControl(campaignId).prizes);
    console.log(`[startup] Nominated demo pool for ${campaignId} (${n} available)`);
    continue;
  }
  const count = db.prepare('SELECT COUNT(*) as c FROM manifest WHERE campaignId = ?').get(campaignId).c;
  if (count === 0) {
    const prizes = generateManifest(seed, 168, campaignId);
    console.log(`[startup] Prize manifest for ${campaignId} (${prizes.length} prizes)`);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Render terminates TLS at the edge — needed for correct req.protocol behind proxy
app.set('trust proxy', 1);

// Ensure required directories exist at startup
for (const dir of ['uploads', 'data']) {
  const p = path.join(__dirname, '..', dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded receipts (only accessible in dev; in production use pre-signed URLs or similar)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/campaign-packages', express.static(path.join(__dirname, 'public/campaign-packages')));

// API routes
app.use('/api/claims', require('./routes/claims'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api/scan', require('./routes/scan'));
app.use('/api/device', require('./routes/device'));
app.use('/api/lab', require('./routes/lab'));
app.use('/api/fulfil', require('./routes/fulfil'));

// Health check — used by Render and puk-firmware on boot
app.get('/api/health', (req, res) => {
  let database = 'ok';
  try {
    db.prepare('SELECT 1 AS ok').get();
  } catch (err) {
    database = 'error';
    console.error('Health check DB error:', err.message);
  }

  const payload = {
    status: database === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    demoMode: process.env.DEMO_MODE === 'true',
    activeCampaignId: getActiveDemoCampaignId(db),
    otpMode: getOtpMode(),
    birdConfigured: hasBirdConfig(),
    birdEnv: birdEnvStatus(),
    resendConfigured: resendConfigured(),
    database,
    baseUrl: getBaseUrl(),
  };

  res.status(database === 'ok' ? 200 : 503).json(payload);
});

// Serve client/public/ first — asset changes (PNGs etc) are instant without a rebuild
app.use(express.static(path.join(__dirname, '../client/public')));

// Serve the built React app whenever dist/ exists (production or local preview)
const distPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  const baseUrl = getBaseUrl();
  const warning = getPublicBaseUrlWarning();

  console.log(`\n🎰 PureRandom Instant Win — Server running on port ${PORT}`);
  console.log(`   Public URL: ${baseUrl}`);
  console.log(`   Demo mode : ${process.env.DEMO_MODE === 'true' ? 'ON  ⚡ (HOKA: every 2nd nominated prize · others: 2nd/5th/12th/10th)' : 'OFF (timestamp windows)'}`);
  console.log(`   OTP mode  : ${getOtpMode() === 'bird' ? 'Bird SMS' : 'DEMO (123456) — set BIRD_* env vars for real SMS'}`);
  console.log(`   Seed      : ${process.env.MOCK_SEED || '(default)'}`);
  console.log(`   Admin     : ${baseUrl}/admin`);
  console.log(`   PUK demo  : ${baseUrl}/demo/device`);
  if (warning) console.warn(`\n   ⚠️  ${warning}\n`);
  else console.log('');
});
