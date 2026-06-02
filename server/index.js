const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

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

// Health check for Render
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    demoMode: process.env.DEMO_MODE === 'true',
    // PRODUCTION TODO: add database connectivity check, manifest status, prize pool status
  });
});

// Serve the built React app whenever dist/ exists (production or local preview)
const distPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`\n🎰 PureRandom Instant Win — Server running on port ${PORT}`);
  console.log(`   Demo mode : ${process.env.DEMO_MODE === 'true' ? 'ON  ⚡ (every 5th/12th/30th claim wins)' : 'OFF (timestamp windows)'}`);
  console.log(`   Seed      : ${process.env.MOCK_SEED || '(default)'}`);
  console.log(`   Admin     : http://localhost:${PORT}/admin\n`);
});
