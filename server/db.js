const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../data/instant-win.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    tagline TEXT NOT NULL,
    mechanic TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    deviceCode TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    retailer TEXT NOT NULL,
    storeName TEXT NOT NULL,
    storeCode TEXT NOT NULL,
    campaignId TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    locationLabel TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS issued_tokens (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    tokenHash TEXT NOT NULL,
    campaignId TEXT NOT NULL,
    deviceId TEXT NOT NULL,
    storeCode TEXT NOT NULL,
    issuedAt INTEGER NOT NULL,
    expiresAt INTEGER NOT NULL,
    scannedAt INTEGER,
    redeemedAt INTEGER,
    status TEXT NOT NULL DEFAULT 'issued',
    claimId TEXT,
    metadata TEXT
  );

  CREATE TABLE IF NOT EXISTS manifest (
    prizeId TEXT PRIMARY KEY,
    tier INTEGER NOT NULL,
    prizeName TEXT NOT NULL,
    value REAL NOT NULL,
    winningTimestamp INTEGER NOT NULL,
    winningWindowSeconds INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    assignedClaimId TEXT,
    seedHash TEXT NOT NULL,
    auditHash TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS claims (
    claimId TEXT PRIMARY KEY,
    mobile TEXT NOT NULL,
    receiptNumber TEXT NOT NULL,
    receiptFilename TEXT,
    spendAmount REAL NOT NULL,
    selectedBrand TEXT NOT NULL,
    termsAccepted INTEGER NOT NULL DEFAULT 0,
    result TEXT NOT NULL DEFAULT 'NOT_WINNER',
    claimStatus TEXT NOT NULL DEFAULT 'CREATED',
    prizeId TEXT,
    prizeName TEXT,
    adminNote TEXT,
    ipAddress TEXT,
    createdAt INTEGER NOT NULL,
    revealedAt INTEGER,
    validatedAt INTEGER
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    action TEXT NOT NULL,
    claimId TEXT,
    prizeId TEXT,
    details TEXT,
    hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS demo_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Create indexes separately (IF NOT EXISTS guards prevent duplication errors)
try { db.exec('ALTER TABLE claims ADD COLUMN customerName TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN purchaseDate TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN storeCode TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN productSku TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN productDescription TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN receiptSource TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN verificationMethod TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN receiptValidationStatus TEXT'); } catch {}
try { db.exec('CREATE UNIQUE INDEX idx_claims_receipt ON claims(receiptNumber)'); } catch {}
try { db.exec('CREATE INDEX idx_claims_mobile ON claims(mobile)'); } catch {}
try { db.exec('CREATE INDEX idx_claims_status ON claims(claimStatus)'); } catch {}
try { db.exec('CREATE INDEX idx_manifest_status ON manifest(status)'); } catch {}
try { db.exec('CREATE INDEX idx_manifest_ts ON manifest(winningTimestamp)'); } catch {}
try { db.exec('CREATE INDEX idx_audit_claimId ON audit_log(claimId)'); } catch {}
try { db.exec('CREATE INDEX idx_audit_ts ON audit_log(timestamp)'); } catch {}
try { db.exec('CREATE UNIQUE INDEX idx_devices_code ON devices(deviceCode)'); } catch {}
try { db.exec('CREATE UNIQUE INDEX idx_tokens_token ON issued_tokens(token)'); } catch {}
try { db.exec('CREATE INDEX idx_tokens_status ON issued_tokens(status)'); } catch {}
try { db.exec('ALTER TABLE campaigns ADD COLUMN config TEXT'); } catch {}

const DEMO_CAMPAIGNS = [
  {
    id: 'niterra-ngk-2026',
    name: 'Niterra',
    brand: 'NGK / NTK / KYB',
    tagline: 'Buy any eligible NGK, NTK or KYB product and instantly win',
    mechanic: 'Spend $50+ on eligible NGK, NTK or KYB products',
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    config: { themeColor: '#e86600', eligibleBrands: ['NGK', 'NTK', 'KYB'], landingHeroUrl: '/instant-win/hero.png' },
  },
  {
    id: 'castrol-2026',
    name: 'Castrol',
    brand: 'Castrol',
    tagline: 'Power Up & Win on Castrol motor oil',
    mechanic: 'Buy participating Castrol products',
    startDate: '2026-07-15',
    endDate: '2026-10-15',
    config: { themeColor: '#00a84a', eligibleBrands: ['Castrol Edge', 'Castrol GTX', 'Castrol Magnatec'] },
  },
  {
    id: 'cocacola-2026',
    name: 'Coca-Cola',
    brand: 'Coca-Cola',
    tagline: 'Refresh & Win',
    mechanic: 'Buy participating Coca-Cola products',
    startDate: '2026-08-01',
    endDate: '2026-09-30',
    config: { themeColor: '#E8112D', eligibleBrands: ['Coca-Cola', 'Diet Coke', 'Sprite'] },
  },
  {
    id: 'vb-2026',
    name: 'VB',
    brand: 'Victoria Bitter',
    tagline: 'Hard Earned Wins',
    mechanic: 'Buy participating VB products — 18+ only',
    startDate: '2026-09-01',
    endDate: '2026-11-30',
    config: { themeColor: '#C9A84C', eligibleBrands: ['VB', 'VB Gold', 'VB Raw'] },
  },
  {
    id: 'redbull-2026',
    name: 'Red Bull',
    brand: 'Red Bull',
    tagline: 'Gives You Wings — Instant Win',
    mechanic: 'Buy participating Red Bull products',
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    config: { themeColor: '#003087', eligibleBrands: ['Red Bull', 'Red Bull Sugarfree', 'Red Bull Zero'] },
  },
];

for (const c of DEMO_CAMPAIGNS) {
  const existing = db.prepare('SELECT id FROM campaigns WHERE id = ?').get(c.id);
  const configJson = JSON.stringify(c.config);
  if (!existing) {
    db.prepare(`INSERT INTO campaigns (id, name, brand, tagline, mechanic, startDate, endDate, status, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`).run(
      c.id, c.name, c.brand, c.tagline, c.mechanic, c.startDate, c.endDate, configJson
    );
  } else {
    db.prepare(`UPDATE campaigns SET name = ?, brand = ?, tagline = ?, mechanic = ?, config = ? WHERE id = ?`).run(
      c.name, c.brand, c.tagline, c.mechanic, configJson, c.id
    );
  }
}

const activeDemo = db.prepare('SELECT value FROM demo_settings WHERE key = ?').get('activeCampaignId');
if (!activeDemo) {
  db.prepare('INSERT INTO demo_settings (key, value) VALUES (?, ?)').run('activeCampaignId', 'niterra-ngk-2026');
}

const existingDevice = db.prepare('SELECT id FROM devices WHERE deviceCode = ?').get('PR-DEMO-001');
if (!existingDevice) {
  const now = Date.now();
  db.prepare(`INSERT INTO devices (id, deviceCode, name, retailer, storeName, storeCode, campaignId, status, locationLabel, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'device-demo-001',
    'PR-DEMO-001',
    'Pure Random Demo Device',
    'Demo Retailer',
    'Demo Store',
    'DEMO-001',
    'niterra-ngk-2026',
    'active',
    'Counter',
    now,
    now
  );
}

const existingUnit = db.prepare('SELECT id FROM devices WHERE deviceCode = ?').get('PR-UNIT-001');
if (!existingUnit) {
  const now = Date.now();
  db.prepare(`INSERT INTO devices (id, deviceCode, name, retailer, storeName, storeCode, campaignId, status, locationLabel, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'device-unit-001',
    'PR-UNIT-001',
    'PUK Unit 001',
    'Demo Retailer',
    'Demo Store',
    'DEMO-001',
    'niterra-ngk-2026',
    'active',
    'Counter',
    now,
    now
  );
}

db.prepare(`UPDATE devices SET retailer = ?, storeName = ?, storeCode = ? WHERE deviceCode IN ('PR-DEMO-001', 'PR-UNIT-001')`)
  .run('Demo Retailer', 'Demo Store', 'DEMO-001');

module.exports = db;
