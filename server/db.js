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
try { db.exec('ALTER TABLE claims ADD COLUMN storeName TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN purchaseTime TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN campaignId TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN postcode TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN redemptionCode TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN redemptionStatus TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN fulfilledAt INTEGER'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN fulfilmentToken TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN winnerSmsStatus TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN winnerEmailStatus TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN fulfilledBy TEXT'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN redemptionExpiresAt INTEGER'); } catch {}
try { db.exec('ALTER TABLE claims ADD COLUMN redeemedAfterExpiry INTEGER'); } catch {}
try { db.exec('ALTER TABLE manifest ADD COLUMN campaignId TEXT'); } catch {}
try { db.exec('CREATE INDEX idx_manifest_campaign ON manifest(campaignId)'); } catch {}
try { db.exec('CREATE INDEX idx_claims_campaign ON claims(campaignId)'); } catch {}
try {
  db.prepare("UPDATE manifest SET campaignId = 'niterra-ngk-2026' WHERE campaignId IS NULL OR campaignId = ''").run();
} catch {}
try {
  db.prepare("UPDATE claims SET campaignId = 'niterra-ngk-2026' WHERE campaignId IS NULL OR campaignId = ''").run();
} catch {}
try { db.exec('CREATE UNIQUE INDEX idx_claims_redemption ON claims(redemptionCode)'); } catch {}
try { db.exec('CREATE UNIQUE INDEX idx_claims_fulfilment ON claims(fulfilmentToken)'); } catch {}
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

const { audiDemoPrizes } = require('./lib/audiCampaign');
const { fordDemoPrizes } = require('./lib/fordCampaign');
const { castrolDemoPrizes } = require('./lib/castrolCampaign');
const { smirnoffDemoPrizes } = require('./lib/smirnoffCampaign');

const DEMO_CAMPAIGNS = [
  {
    id: 'niterra-ngk-2026',
    name: 'Niterra',
    brand: 'NGK / NTK / KYB',
    tagline: 'Buy any eligible NGK, NTK or KYB product and instantly win',
    mechanic: 'Spend $50+ on eligible NGK, NTK or KYB products',
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    config: {
      themeColor: '#e86600',
      eligibleBrands: ['NGK', 'NTK', 'KYB'],
      formArtUrl: '/campaigns/niterra/iwbg.png',
      landingHeroUrl: '/campaigns/niterra/iwbg.png',
      idleVideoUrl: '/campaigns/niterra/ngk.mp4',
      qrBgUrl: '/campaigns/niterra/scan.jpg',
      demoControl: {
        enabled: true,
        winEvery: 1,
        sweepstakesOnLose: false,
        sweepstakesMessage: "You're not an instant winner this time. You've been automatically entered into the weekly prize draw.",
        claimOffset: 0,
        prizes: [
          { name: 'NGK Racing Cap', value: 35, qty: 24, image: '/campaigns/niterra/cap.png' },
          { name: 'KYB Workshop Cap', value: 35, qty: 24, image: '/campaigns/niterra/cap.png' },
        ],
      },
    },
  },
  {
    id: 'hoka-2026',
    name: 'HOKA Instant Win',
    brand: 'HOKA',
    tagline: 'Win your HOKA purchase back instantly',
    mechanic: 'Spend $50 or more on qualifying HOKA products at Cotswold Outdoor in one transaction',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    config: {
      themeColor: '#dfff00',
      labCampaignStats: {
        winningMoments: 280,
        claimed: 175,
        remaining: 94,
        unawarded: 11,
        unawardedNote: 'online draw',
      },
      schedule: {
        timezone: 'Europe/London',
        locale: 'en-GB',
        activationHours: { start: '08:00', end: '22:00' },
        days: [0, 1, 2, 3, 4, 5, 6],
      },
      entryVariant: 'hoka-cotswold',
      minSpend: 50,
      currency: 'AUD',
      eligibleBrands: ['HOKA Footwear', 'HOKA Apparel', 'HOKA Accessories'],
      heroImageUrl: '/campaigns/hoka/slide1.jpg',
      formArtUrl: '/campaigns/hoka/iwbg.jpg',
      retailer: 'Cotswold Outdoor',
      defaultStoreName: 'Cotswold Outdoor Birmingham',
      prizeByResult: {
        TIER_1_INSTANT_WIN: 'HOKA Crew Socks',
        TIER_2_PROVISIONAL_WIN: 'HOKA Run Cap',
        TIER_3_PROVISIONAL_WIN: 'HOKA Run Belt',
      },
      demoControl: {
        enabled: true,
        winEvery: 1,
        sweepstakesOnLose: true,
        sweepstakesMessage: "You're not an instant winner this time. You've been automatically entered into the sweepstakes prize draw.",
        claimOffset: 0,
        prizes: [
          { name: 'HOKA Crew Socks', value: 25, qty: 4, image: '/campaigns/hoka/socks.png' },
          { name: 'HOKA Run Cap', value: 35, qty: 4, image: '/campaigns/hoka/cap.png' },
          { name: 'HOKA Run Belt', value: 45, qty: 4, image: '/campaigns/hoka/belt.png' },
          { name: 'HOKA Race Sleeves', value: 40, qty: 4, image: '/campaigns/hoka/sleeves.png' },
          { name: '$50 Cotswold Outdoor Voucher', value: 50, qty: 4, image: '/campaigns/hoka/gift.png' },
        ],
      },
    },
  },
  {
    id: 'castrol-2026',
    name: 'Castrol Instant Win',
    brand: 'Castrol',
    tagline: 'Buy Castrol — every entry wins an instant prize',
    mechanic: 'Purchase participating Castrol motor oil and enter online',
    startDate: '2026-07-15',
    endDate: '2026-12-31',
    config: {
      themeColor: '#00a84a',
      entryVariant: 'castrol-instant-win',
      entryPath: '/enter/castrol',
      eligibleBrands: ['Castrol EDGE', 'Castrol GTX', 'Castrol Magnatec'],
      defaultStoreName: 'Castrol Instant Win',
      defaultStoreCode: 'castrol-demo',
      retailer: 'Castrol',
      formArtUrl: '/campaigns/castrol/bg.jpg',
      landingHeroUrl: '/campaigns/castrol/bg.jpg',
      qrBgUrl: '/campaigns/castrol/bg.jpg',
      demoControl: {
        enabled: true,
        winEvery: 1,
        sweepstakesOnLose: false,
        sweepstakesMessage: '',
        claimOffset: 0,
        prizes: castrolDemoPrizes(),
      },
    },
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
  {
    id: 'ford-2026',
    name: 'Ford Display Lab',
    brand: 'Ford',
    tagline: 'Go Further — Instant Win',
    mechanic: 'Display lab — scan QR to enter the Ford instant win form',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    config: {
      themeColor: '#003478',
      entryVariant: 'ford-instant-win',
      entryPath: '/enter/ford',
      eligibleBrands: ['Ranger', 'Everest', 'Mustang', 'Bronco', 'Territory', 'F-150'],
      defaultStoreName: 'Ford Display Lab',
      formArtUrl: '/campaigns/ford/scan.jpg',
      landingHeroUrl: '/campaigns/ford/landing.jpg',
      idleVideoUrl: '/campaigns/ford/ford.mp4',
      idleFallbackUrl: '/campaigns/ford/landing.jpg',
      kineticLab: true,
      qrBgUrl: '/campaigns/ford/scan.jpg',
      qrPadBg: '#ffffff',
      demoControl: {
        enabled: true,
        winEvery: 1,
        sweepstakesOnLose: false,
        prizes: fordDemoPrizes(),
      },
    },
  },
  {
    id: 'audi-2026',
    name: 'Audi Instant Win',
    brand: 'Audi',
    tagline: 'Enter for your chance to win instantly',
    mechanic: 'Qualifying Audi purchase at participating dealers',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    config: {
      themeColor: '#bb0a30',
      entryVariant: 'audi-instant-win',
      entryPath: '/enter/audi-instant-win',
      eligibleBrands: ['A3', 'A4', 'A5', 'A6', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9'],
      formArtUrl: '/campaigns/audi/iwbg.png',
      idleVideoUrl: '/campaigns/audi/audi.mp4',
      idleFallbackUrl: '/campaigns/audi/iwbg.png',
      qrBgUrl: '/campaigns/audi/scan.jpg',
      qrPadBg: '#ffffff',
      qrPadRadius: 10,
      defaultStoreName: 'Audi Centre Zetland',
      defaultStoreLocation: 'Zetland NSW',
      defaultStoreCode: 'zetland',
      retailer: 'Audi',
      demoControl: {
        enabled: true,
        winEvery: 1,
        sweepstakesOnLose: false,
        prizes: audiDemoPrizes(),
      },
    },
  },
  {
    id: 'smirnoff-2026',
    name: 'Smirnoff Instant Win',
    brand: 'Smirnoff',
    tagline: 'Buy Smirnoff and win instantly',
    mechanic: 'Qualifying Smirnoff purchase at Thirsty Camel Coolum',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    config: {
      themeColor: '#E10600',
      entryVariant: 'smirnoff-instant-win',
      entryPath: '/enter/smirnoff',
      eligibleBrands: ['Smirnoff'],
      defaultStoreName: 'Thirsty Camel Coolum',
      defaultStoreCode: 'thirsty-camel-coolum',
      retailer: 'Thirsty Camel',
      customerQrRedemption: true,
      redemptionWindowMinutes: 30,
      customerWinTheme: {
        background: '#000000',
        accent: '#E10600',
        text: '#ffffff',
      },
      demoControl: {
        enabled: true,
        winEvery: 1,
        sweepstakesOnLose: false,
        sweepstakesMessage: '',
        claimOffset: 0,
        prizes: smirnoffDemoPrizes(),
      },
    },
  },
  {
    id: 'hankook-2026',
    name: 'Hankook Instant Win',
    brand: 'Hankook',
    tagline: 'Buy Hankook and win instantly',
    mechanic: 'Qualifying Hankook purchase at a participating store',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    config: {
      themeColor: '#f36f21',
      eligibleBrands: ['Hankook'],
      defaultStoreName: 'Hankook Demo',
      demoControl: {
        enabled: true,
        winEvery: 1,
        sweepstakesOnLose: false,
        claimOffset: 0,
        prizes: [
          { name: 'Hankook Cap', value: 25, qty: 20 },
          { name: 'Hankook $50 voucher', value: 50, qty: 10 },
        ],
      },
    },
  },
  {
    id: 'puk-demo',
    name: 'PUK Demo',
    brand: 'PUK',
    tagline: 'Built-in demo when no campaign card is loaded',
    mechanic: 'Demonstration entry on the PUK demo unit',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    config: {
      themeColor: '#111111',
      eligibleBrands: ['PUK'],
      defaultStoreName: 'Demo Store',
      retailer: 'Pure Random',
      demoControl: {
        enabled: true,
        winEvery: 1,
        sweepstakesOnLose: false,
        claimOffset: 0,
        prizes: [
          { name: 'Demo prize', value: 10, qty: 50 },
        ],
      },
    },
  },
];

function parseCampaignConfig(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

for (const c of DEMO_CAMPAIGNS) {
  const existing = db.prepare('SELECT id, config FROM campaigns WHERE id = ?').get(c.id);
  const prev = parseCampaignConfig(existing?.config);
  const configObj = {
    ...c.config,
    ...(c.id === 'niterra-ngk-2026' && c.config.demoControl
      ? {
          demoControl: {
            ...c.config.demoControl,
            claimOffset: prev.demoControl?.claimOffset || 0,
          },
        }
      : c.id === 'hoka-2026' && c.config.demoControl
      ? {
          demoControl: {
            ...c.config.demoControl,
            claimOffset: prev.demoControl?.claimOffset || 0,
          },
        }
      : c.id === 'audi-2026' && c.config.demoControl
        ? {
            demoControl: {
              ...c.config.demoControl,
              claimOffset: prev.demoControl?.claimOffset || 0,
            },
          }
        : c.id === 'ford-2026' && c.config.demoControl
          ? {
              demoControl: {
                ...c.config.demoControl,
                claimOffset: prev.demoControl?.claimOffset || 0,
              },
            }
          : c.id === 'castrol-2026' && c.config.demoControl
            ? {
                demoControl: {
                  ...c.config.demoControl,
                  claimOffset: prev.demoControl?.claimOffset || 0,
                },
              }
            : c.id === 'smirnoff-2026' && c.config.demoControl
              ? {
                  demoControl: {
                    ...c.config.demoControl,
                    claimOffset: prev.demoControl?.claimOffset || 0,
                  },
                }
              : (prev.demoControl ? { demoControl: prev.demoControl } : {})),
  };
  if ([
    'niterra-ngk-2026',
    'hoka-2026',
    'castrol-2026',
    'ford-2026',
    'audi-2026',
    'hankook-2026',
    'smirnoff-2026',
    'puk-demo',
  ].includes(c.id)) {
    configObj.customerQrRedemption = true;
    configObj.redemptionWindowMinutes = configObj.redemptionWindowMinutes || 30;
    configObj.customerWinTheme = configObj.customerWinTheme || {
      background: '#000000',
      accent: configObj.themeColor || '#ffffff',
      text: '#ffffff',
    };
  }
  const configJson = JSON.stringify(configObj);
  if (!existing) {
    db.prepare(`INSERT INTO campaigns (id, name, brand, tagline, mechanic, startDate, endDate, status, config)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`).run(
      c.id, c.name, c.brand, c.tagline, c.mechanic, c.startDate, c.endDate, configJson
    );
  } else {
    db.prepare(`UPDATE campaigns SET name = ?, brand = ?, tagline = ?, mechanic = ?, startDate = ?, endDate = ?, config = ? WHERE id = ?`).run(
      c.name, c.brand, c.tagline, c.mechanic, c.startDate, c.endDate, configJson, c.id
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
    'Repco',
    'Repco Waurn Ponds',
    '247',
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

const existingSc01 = db.prepare('SELECT id FROM devices WHERE deviceCode = ?').get('PR-SC01-001');
if (existingSc01) {
  db.prepare(`UPDATE devices SET deviceCode = ?, name = ? WHERE deviceCode = ?`)
    .run('PR-PUK2-001', 'PUK2', 'PR-SC01-001');
}

const existingPuk2 = db.prepare('SELECT id FROM devices WHERE deviceCode = ?').get('PR-PUK2-001');
if (!existingPuk2) {
  const now = Date.now();
  db.prepare(`INSERT INTO devices (id, deviceCode, name, retailer, storeName, storeCode, campaignId, status, locationLabel, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'device-puk2-001',
    'PR-PUK2-001',
    'PUK2 Cotswold Demo',
    'Cotswold Outdoor',
    'Cotswold Outdoor Birmingham',
    'cotswold-birmingham',
    'hoka-2026',
    'active',
    'Birmingham UK',
    now,
    now
  );
}

db.prepare(`UPDATE devices SET retailer = ?, storeName = ?, storeCode = ?, locationLabel = ? WHERE deviceCode IN ('PR-DEMO-001', 'PR-UNIT-001')`)
  .run('Repco', 'Repco Waurn Ponds', '247', 'Store 247');

db.prepare(`UPDATE devices SET name = ?, retailer = ?, storeName = ?, storeCode = ?, campaignId = ?, locationLabel = ?, updatedAt = ? WHERE deviceCode = ?`)
  .run(
    'PUK2 Cotswold Demo',
    'Cotswold Outdoor',
    'Cotswold Outdoor Birmingham',
    'cotswold-birmingham',
    'hoka-2026',
    'Birmingham UK',
    Date.now(),
    'PR-PUK2-001',
  );

const existingPuk2Dev4 = db.prepare('SELECT id FROM devices WHERE deviceCode = ?').get('PR-PUK2-004');
if (!existingPuk2Dev4) {
  const now = Date.now();
  db.prepare(`INSERT INTO devices (id, deviceCode, name, retailer, storeName, storeCode, campaignId, status, locationLabel, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'device-puk2-004',
    'PR-PUK2-004',
    'PUK2 Demo',
    'Pure Random',
    'Demo Store',
    'puk-demo',
    'puk-demo',
    'active',
    'Demo unit',
    now,
    now
  );
}
db.prepare(`UPDATE devices SET name = ?, retailer = ?, storeName = ?, storeCode = ?, campaignId = ?, locationLabel = ?, updatedAt = ? WHERE deviceCode = ?`)
  .run(
    'PUK2 Demo',
    'Pure Random',
    'Demo Store',
    'puk-demo',
    'puk-demo',
    'Demo unit',
    Date.now(),
    'PR-PUK2-004',
  );

const existingPuk2Dev2 = db.prepare('SELECT id FROM devices WHERE deviceCode = ?').get('PR-PUK2-002');
if (!existingPuk2Dev2) {
  const now = Date.now();
  db.prepare(`INSERT INTO devices (id, deviceCode, name, retailer, storeName, storeCode, campaignId, status, locationLabel, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    'device-puk2-002',
    'PR-PUK2-002',
    'PUK2 backup',
    'Pure Random',
    'Demo backup',
    'puk2-002',
    'castrol-2026',
    'active',
    'Backup unit',
    now,
    now
  );
}

module.exports = db;
