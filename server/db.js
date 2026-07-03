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
`);

// Create indexes separately (IF NOT EXISTS guards prevent duplication errors)
try { db.exec('ALTER TABLE claims ADD COLUMN customerName TEXT'); } catch {}
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

// Seed demo campaign + device if not present
const existingCampaign = db.prepare('SELECT id FROM campaigns WHERE id = ?').get('niterra-ngk-2026');
if (!existingCampaign) {
  db.prepare(`INSERT INTO campaigns (id, name, brand, tagline, mechanic, startDate, endDate, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'niterra-ngk-2026',
    'Niterra NGK / NTK / KYB Instant Win',
    'NGK / NTK / KYB',
    'Buy any eligible NGK, NTK or KYB product and instantly win',
    'Spend $50+ on NGK, NTK or KYB products at Repco',
    '2026-06-01',
    '2026-12-31',
    'active'
  );
}

const existingDevice = db.prepare('SELECT id FROM devices WHERE deviceCode = ?').get('PR-DEMO-001');
if (!existingDevice) {
  const now = Date.now();
  db.prepare(`INSERT INTO devices (id, deviceCode, name, retailer, storeName, storeCode, campaignId, status, locationLabel, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'device-demo-001',
    'PR-DEMO-001',
    'Pure Random Demo Device',
    'Repco',
    'Repco Demo Store',
    'REPCO-DEMO',
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
    'Repco',
    'Repco Demo Store',
    'REPCO-DEMO',
    'niterra-ngk-2026',
    'active',
    'Counter',
    now,
    now
  );
}

module.exports = db;
