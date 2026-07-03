const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { getBaseUrl, getPublicBaseUrlWarning } = require('./lib/baseUrl');

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

// API routes
app.use('/api/claims', require('./routes/claims'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/otp', require('./routes/otp'));
app.use('/api/scan', require('./routes/scan'));
app.use('/api/device', require('./routes/device'));

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
  console.log(`   Demo mode : ${process.env.DEMO_MODE === 'true' ? 'ON  ⚡ (every 5th/12th/30th claim wins)' : 'OFF (timestamp windows)'}`);
  console.log(`   Seed      : ${process.env.MOCK_SEED || '(default)'}`);
  console.log(`   Admin     : ${baseUrl}/admin`);
  console.log(`   PUK demo  : ${baseUrl}/demo/device`);
  if (warning) console.warn(`\n   ⚠️  ${warning}\n`);
  else console.log('');
});
