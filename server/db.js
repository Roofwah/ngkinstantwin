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
try { db.exec('CREATE UNIQUE INDEX idx_claims_receipt ON claims(receiptNumber)'); } catch {}
try { db.exec('CREATE INDEX idx_claims_mobile ON claims(mobile)'); } catch {}
try { db.exec('CREATE INDEX idx_claims_status ON claims(claimStatus)'); } catch {}
try { db.exec('CREATE INDEX idx_manifest_status ON manifest(status)'); } catch {}
try { db.exec('CREATE INDEX idx_manifest_ts ON manifest(winningTimestamp)'); } catch {}
try { db.exec('CREATE INDEX idx_audit_claimId ON audit_log(claimId)'); } catch {}
try { db.exec('CREATE INDEX idx_audit_ts ON audit_log(timestamp)'); } catch {}

module.exports = db;
