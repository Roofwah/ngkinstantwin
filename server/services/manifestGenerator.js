const crypto = require('crypto');
const db = require('../db');
const { audiManifestPrizes } = require('../lib/audiCampaign');

const DEFAULT_CAMPAIGN_ID = 'niterra-ngk-2026';

const NITERRA_PRIZES = {
  tier1: [
    { prizeName: 'NGK Racing Cap', value: 15 },
    { prizeName: 'KYB Workshop Cap', value: 15 },
  ],
  tier2: [
    { prizeName: 'NGK Racing Cap', value: 15 },
    { prizeName: 'KYB Workshop Cap', value: 15 },
  ],
  tier3: [
    { prizeName: 'NGK Racing Cap', value: 15 },
    { prizeName: 'KYB Workshop Cap', value: 15 },
  ],
};

const AUDI_PRIZES = audiManifestPrizes();

const HOKA_PRIZES = {
  tier1: [
    { prizeName: 'HOKA Crew Socks', value: 25 },
    { prizeName: 'HOKA Run Cap', value: 35 },
    { prizeName: 'HOKA Run Belt', value: 45 },
    { prizeName: 'HOKA Race Sleeves', value: 40 },
    { prizeName: '$50 Cotswold Outdoor Voucher', value: 50 },
  ],
  tier2: [],
  tier3: [],
};

function genericPrizes(label) {
  return {
    tier1: [
      { prizeName: `${label} instant prize`, value: 25 },
      { prizeName: `${label} gift voucher $25`, value: 25 },
      { prizeName: `${label} merch pack`, value: 30 },
      { prizeName: `${label} instant prize`, value: 20 },
    ],
    tier2: [
      { prizeName: `${label} $100 voucher`, value: 100 },
      { prizeName: `${label} $250 voucher`, value: 250 },
    ],
    tier3: [
      { prizeName: `${label} major prize`, value: 1000 },
    ],
  };
}

const PRIZE_TIERS = NITERRA_PRIZES;

function prizesForCampaign(campaignId) {
  const { nominatedCatalog } = require('./demoControl');
  const nominated = nominatedCatalog(campaignId);
  if (nominated?.tier1?.length) return nominated;
  if (campaignId === 'hoka-2026') return HOKA_PRIZES;
  if (campaignId === 'niterra-ngk-2026') return NITERRA_PRIZES;
  if (campaignId === 'audi-2026') return AUDI_PRIZES;
  const row = db.prepare('SELECT name FROM campaigns WHERE id = ?').get(campaignId);
  return genericPrizes(row?.name || 'Campaign');
}

function deterministicHash(seed, label) {
  return crypto.createHash('sha256').update(`${seed}:${label}`).digest('hex');
}

function makeAuditHash(prizeId, tier, winningTimestamp, seedHash) {
  return crypto
    .createHash('sha256')
    .update(`${prizeId}:${tier}:${winningTimestamp}:${seedHash}`)
    .digest('hex');
}

function generateManifest(seed, windowHours = 24, campaignId = DEFAULT_CAMPAIGN_ID) {
  const resolvedCampaignId = campaignId || DEFAULT_CAMPAIGN_ID;
  const { usesNthWinDemo, loadNominatedIntoPool, getDemoControl } = require('./demoControl');
  if (usesNthWinDemo(resolvedCampaignId)) {
    const control = getDemoControl(resolvedCampaignId);
    loadNominatedIntoPool(resolvedCampaignId, control.prizes);
    return db.prepare("SELECT * FROM manifest WHERE campaignId = ? AND status = 'AVAILABLE' ORDER BY createdAt ASC").all(resolvedCampaignId);
  }

  db.prepare('DELETE FROM manifest WHERE campaignId = ?').run(resolvedCampaignId);

  const now = Date.now();
  const windowMs = windowHours * 60 * 60 * 1000;
  const catalog = prizesForCampaign(resolvedCampaignId);

  const allPrizes = [
    ...catalog.tier1.map((p) => ({ ...p, tier: 1 })),
    ...catalog.tier2.map((p) => ({ ...p, tier: 2 })),
    ...catalog.tier3.map((p) => ({ ...p, tier: 3 })),
  ];

  const shuffled = [...allPrizes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const h = deterministicHash(seed, `${resolvedCampaignId}:shuffle:${i}`);
    const j = parseInt(h.slice(0, 8), 16) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const prizes = shuffled.map((prize, idx) => {
    const tsHash = deterministicHash(seed, `${resolvedCampaignId}:timestamp:${idx}`);
    const offsetFraction = parseInt(tsHash.slice(0, 8), 16) / 0xffffffff;
    const winningTimestamp = now + Math.floor(offsetFraction * windowMs);

    const wHash = deterministicHash(seed, `${resolvedCampaignId}:window:${idx}`);
    const wFraction = parseInt(wHash.slice(0, 4), 16) / 0xffff;
    const winningWindowSeconds = Math.floor(60 + wFraction * 240);

    const seedHash = deterministicHash(seed, `${resolvedCampaignId}:prize:${idx}`);
    const prizeId = `PRIZE-${resolvedCampaignId.slice(0, 4).toUpperCase()}-${deterministicHash(seed, `${resolvedCampaignId}:id:${idx}`).slice(0, 8).toUpperCase()}`;

    return {
      prizeId,
      tier: prize.tier,
      prizeName: prize.prizeName,
      value: prize.value,
      winningTimestamp,
      winningWindowSeconds,
      status: 'AVAILABLE',
      assignedClaimId: null,
      seedHash,
      auditHash: makeAuditHash(prizeId, prize.tier, winningTimestamp, seedHash),
      createdAt: now,
      campaignId: resolvedCampaignId,
    };
  });

  const insert = db.prepare(`
    INSERT INTO manifest
      (prizeId, tier, prizeName, value, winningTimestamp, winningWindowSeconds,
       status, assignedClaimId, seedHash, auditHash, createdAt, campaignId)
    VALUES
      (@prizeId, @tier, @prizeName, @value, @winningTimestamp, @winningWindowSeconds,
       @status, @assignedClaimId, @seedHash, @auditHash, @createdAt, @campaignId)
  `);

  db.exec('BEGIN');
  try {
    for (const p of prizes) insert.run(p);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return prizes;
}

module.exports = { generateManifest, PRIZE_TIERS, prizesForCampaign };
