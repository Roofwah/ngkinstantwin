const db = require('../db');
const { usesNthWinDemo, isWinSlot } = require('./demoControl');

const DEFAULT_CAMPAIGN_ID = 'niterra-ngk-2026';
const { AUDI_CAMPAIGN_ID, AUDI_VOUCHER_MIN } = require('../lib/audiCampaign');

function getTotalClaimCount(campaignId) {
  if (!campaignId || campaignId === DEFAULT_CAMPAIGN_ID) {
    return db.prepare(`
      SELECT COUNT(*) as count FROM claims
      WHERE campaignId = ? OR campaignId IS NULL OR campaignId = ''
    `).get(DEFAULT_CAMPAIGN_ID).count;
  }
  return db.prepare('SELECT COUNT(*) as count FROM claims WHERE campaignId = ?').get(campaignId).count;
}

function assignPrize(claimId, claimTime, campaignId = DEFAULT_CAMPAIGN_ID) {
  const resolvedCampaignId = campaignId || DEFAULT_CAMPAIGN_ID;
  const demoMode = process.env.DEMO_MODE === 'true';

  if (demoMode) {
    return assignDemoMode(claimId, resolvedCampaignId);
  }

  if (resolvedCampaignId === AUDI_CAMPAIGN_ID) {
    const prize = db.prepare(`
      SELECT * FROM manifest
      WHERE status = 'AVAILABLE' AND campaignId = ? AND value >= ?
      ORDER BY RANDOM()
      LIMIT 1
    `).get(resolvedCampaignId, AUDI_VOUCHER_MIN);
    if (prize) return assignAndReturn(claimId, prize);
    return { result: 'NOT_WINNER', prize: null };
  }

  const prize = db.prepare(`
    SELECT * FROM manifest
    WHERE status = 'AVAILABLE'
      AND campaignId = ?
      AND winningTimestamp <= ?
      AND (winningTimestamp + winningWindowSeconds * 1000) >= ?
    ORDER BY winningTimestamp DESC
    LIMIT 1
  `).get(resolvedCampaignId, claimTime, claimTime);

  if (!prize) return { result: 'NOT_WINNER', prize: null };

  db.prepare('UPDATE manifest SET status = ?, assignedClaimId = ? WHERE prizeId = ?')
    .run('ASSIGNED', claimId, prize.prizeId);

  return { result: tierToResult(prize.tier), prize };
}

function assignAndReturn(claimId, prize) {
  db.prepare('UPDATE manifest SET status = ?, assignedClaimId = ? WHERE prizeId = ?')
    .run('ASSIGNED', claimId, prize.prizeId);
  return { result: tierToResult(prize.tier), prize };
}

function assignDemoMode(claimId, campaignId) {
  const count = getTotalClaimCount(campaignId);

  if (campaignId === AUDI_CAMPAIGN_ID) {
    const prize = db.prepare(`
      SELECT * FROM manifest
      WHERE status = 'AVAILABLE' AND campaignId = ? AND value >= ?
      ORDER BY RANDOM()
      LIMIT 1
    `).get(campaignId, AUDI_VOUCHER_MIN);
    if (prize) return assignAndReturn(claimId, prize);
  }

  if (usesNthWinDemo(campaignId)) {
    if (!isWinSlot(campaignId, count)) return { result: 'NOT_WINNER', prize: null };
    const prize = db.prepare(`
      SELECT * FROM manifest
      WHERE status = 'AVAILABLE' AND campaignId = ?
      ORDER BY createdAt ASC, prizeId ASC
      LIMIT 1
    `).get(campaignId);
    if (!prize) return { result: 'NOT_WINNER', prize: null };
    return assignAndReturn(claimId, prize);
  }

  let targetTier = null;
  if (count % 10 === 0) targetTier = 3;
  else if (count % 12 === 0) targetTier = 2;
  else if (count % 2 === 0 || count % 5 === 0) targetTier = 1;

  if (targetTier === null) return { result: 'NOT_WINNER', prize: null };

  const prize = db.prepare(`
    SELECT * FROM manifest WHERE status = 'AVAILABLE' AND tier = ? AND campaignId = ? LIMIT 1
  `).get(targetTier, campaignId);

  if (!prize) return { result: 'NOT_WINNER', prize: null };

  return assignAndReturn(claimId, prize);
}

function tierToResult(tier) {
  if (tier === 1) return 'TIER_1_INSTANT_WIN';
  if (tier === 2) return 'TIER_2_PROVISIONAL_WIN';
  return 'TIER_3_PROVISIONAL_WIN';
}

module.exports = { assignPrize };
