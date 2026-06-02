const crypto = require('crypto');
const db = require('../db');

const PRIZE_TIERS = {
  tier1: [
    { prizeName: 'NGK Racing Cap', value: 15 },
    { prizeName: 'NGK Stubby Cooler', value: 20 },
    { prizeName: 'Repco Voucher $25', value: 25 },
    { prizeName: 'Workshop Gloves', value: 30 },
    { prizeName: 'NGK Keyring Set', value: 10 },
    { prizeName: 'NGK Water Bottle', value: 18 },
    { prizeName: 'Repco Voucher $25', value: 25 },
    { prizeName: 'KYB Workshop Cap', value: 15 },
  ],
  tier2: [
    { prizeName: '$250 Repco Voucher', value: 250 },
    { prizeName: 'NGK Professional Tool Kit', value: 350 },
    { prizeName: 'KYB Suspension Pack', value: 500 },
    { prizeName: '$500 Workshop Pack', value: 500 },
  ],
  tier3: [
    { prizeName: 'Bathurst Experience Package', value: 2500 },
    { prizeName: 'Major Workshop Upgrade Pack', value: 3000 },
    { prizeName: '$5,000 Repco Rewards Prize', value: 5000 },
  ],
};

// Deterministic hash from seed + label — derives all prize schedule values
function deterministicHash(seed, label) {
  return crypto.createHash('sha256').update(`${seed}:${label}`).digest('hex');
}

function makeAuditHash(prizeId, tier, winningTimestamp, seedHash) {
  return crypto
    .createHash('sha256')
    .update(`${prizeId}:${tier}:${winningTimestamp}:${seedHash}`)
    .digest('hex');
}

function generateManifest(seed, windowHours = 24) {
  db.exec('DELETE FROM manifest');

  const now = Date.now();
  const windowMs = windowHours * 60 * 60 * 1000;

  const allPrizes = [
    ...PRIZE_TIERS.tier1.map(p => ({ ...p, tier: 1 })),
    ...PRIZE_TIERS.tier2.map(p => ({ ...p, tier: 2 })),
    ...PRIZE_TIERS.tier3.map(p => ({ ...p, tier: 3 })),
  ];

  // Deterministic Fisher-Yates shuffle
  const shuffled = [...allPrizes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const h = deterministicHash(seed, `shuffle:${i}`);
    const j = parseInt(h.slice(0, 8), 16) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const prizes = shuffled.map((prize, idx) => {
    const tsHash = deterministicHash(seed, `timestamp:${idx}`);
    const offsetFraction = parseInt(tsHash.slice(0, 8), 16) / 0xffffffff;
    const winningTimestamp = now + Math.floor(offsetFraction * windowMs);

    const wHash = deterministicHash(seed, `window:${idx}`);
    const wFraction = parseInt(wHash.slice(0, 4), 16) / 0xffff;
    const winningWindowSeconds = Math.floor(60 + wFraction * 240);

    const seedHash = deterministicHash(seed, `prize:${idx}`);
    const prizeId = `PRIZE-${deterministicHash(seed, `id:${idx}`).slice(0, 8).toUpperCase()}`;

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
    };
  });

  const insert = db.prepare(`
    INSERT INTO manifest
      (prizeId, tier, prizeName, value, winningTimestamp, winningWindowSeconds,
       status, assignedClaimId, seedHash, auditHash, createdAt)
    VALUES
      (@prizeId, @tier, @prizeName, @value, @winningTimestamp, @winningWindowSeconds,
       @status, @assignedClaimId, @seedHash, @auditHash, @createdAt)
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

module.exports = { generateManifest, PRIZE_TIERS };
