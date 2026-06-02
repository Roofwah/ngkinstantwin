const db = require('../db');

function getTotalClaimCount() {
  return db.prepare('SELECT COUNT(*) as count FROM claims').get().count; // includes current claim (inserted before assignPrize)
}

function assignPrize(claimId, claimTime) {
  const demoMode = process.env.DEMO_MODE === 'true';

  if (demoMode) {
    return assignDemoMode(claimId);
  }

  // Real mode: find an open prize window matching the claim timestamp
  const prize = db.prepare(`
    SELECT * FROM manifest
    WHERE status = 'AVAILABLE'
      AND winningTimestamp <= ?
      AND (winningTimestamp + winningWindowSeconds * 1000) >= ?
    ORDER BY winningTimestamp DESC
    LIMIT 1
  `).get(claimTime, claimTime);

  if (!prize) return { result: 'NOT_WINNER', prize: null };

  db.prepare(`UPDATE manifest SET status = 'ASSIGNED', assignedClaimId = ? WHERE prizeId = ?`)
    .run(claimId, prize.prizeId);

  return { result: tierToResult(prize.tier), prize };
}

// Demo mode: every 5th = Tier 1, every 12th = Tier 2, every 30th = Tier 3
// Counter is based on total claims submitted (including this one, hence +1)
function assignDemoMode(claimId) {
  const count = getTotalClaimCount(); // claim already inserted, so this is the true 1-based position

  let targetTier = null;
  if (count % 30 === 0) targetTier = 3;
  else if (count % 12 === 0) targetTier = 2;
  else if (count % 5 === 0) targetTier = 1;

  if (targetTier === null) return { result: 'NOT_WINNER', prize: null };

  const prize = db.prepare(`
    SELECT * FROM manifest WHERE status = 'AVAILABLE' AND tier = ? LIMIT 1
  `).get(targetTier);

  if (!prize) return { result: 'NOT_WINNER', prize: null };

  db.prepare(`UPDATE manifest SET status = 'ASSIGNED', assignedClaimId = ? WHERE prizeId = ?`)
    .run(claimId, prize.prizeId);

  return { result: tierToResult(prize.tier), prize };
}

function tierToResult(tier) {
  if (tier === 1) return 'TIER_1_INSTANT_WIN';
  if (tier === 2) return 'TIER_2_PROVISIONAL_WIN';
  return 'TIER_3_PROVISIONAL_WIN';
}

module.exports = { assignPrize };
