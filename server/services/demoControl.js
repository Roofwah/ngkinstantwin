const crypto = require('crypto');
const db = require('../db');
const { loadCampaign } = require('./demoCampaign');
const { audiDemoPrizes } = require('../lib/audiCampaign');

const DEFAULT_SWEEPSTAKES =
  "You're not an instant winner this time. You've been automatically entered into the sweepstakes prize draw.";

const HOKA_DEFAULT_PRIZES = [
  { name: 'HOKA Crew Socks', value: 25, qty: 4, image: '/campaigns/hoka/socks.png' },
  { name: 'HOKA Run Cap', value: 35, qty: 4, image: '/campaigns/hoka/cap.png' },
  { name: 'HOKA Run Belt', value: 45, qty: 4, image: '/campaigns/hoka/belt.png' },
  { name: 'HOKA Race Sleeves', value: 40, qty: 4, image: '/campaigns/hoka/sleeves.png' },
  { name: '$50 Cotswold Outdoor Voucher', value: 50, qty: 4, image: '/campaigns/hoka/gift.png' },
];

function parseConfig(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalisePrize(row) {
  const name = String(row?.name || row?.prizeName || '').trim();
  const value = Number(row?.value);
  const qty = Number(row?.qty);
  return {
    name,
    value: Number.isFinite(value) && value >= 0 ? value : 0,
    qty: Number.isFinite(qty) ? Math.max(1, Math.min(200, Math.floor(qty))) : 1,
    image: String(row?.image || '').trim() || null,
  };
}

function defaultControl(campaignId) {
  if (campaignId === 'hoka-2026') {
    return {
      enabled: true,
      winEvery: 2,
      sweepstakesOnLose: true,
      sweepstakesMessage: DEFAULT_SWEEPSTAKES,
      claimOffset: 0,
      prizes: HOKA_DEFAULT_PRIZES,
    };
  }
  if (campaignId === 'audi-2026') {
    return {
      enabled: true,
      winEvery: 1,
      sweepstakesOnLose: false,
      sweepstakesMessage: DEFAULT_SWEEPSTAKES,
      claimOffset: 0,
      prizes: audiDemoPrizes(),
    };
  }
  return {
    enabled: false,
    winEvery: 2,
    sweepstakesOnLose: true,
    sweepstakesMessage: DEFAULT_SWEEPSTAKES,
    claimOffset: 0,
    prizes: [],
  };
}

function getDemoControl(campaignId) {
  const fallback = defaultControl(campaignId);
  const campaign = loadCampaign(db, campaignId);
  const stored = campaign?.config?.demoControl;
  if (!stored || typeof stored !== 'object') return { ...fallback, campaignName: campaign?.name || campaignId };

  const winEvery = Number(stored.winEvery);
  return {
    enabled: stored.enabled == null ? fallback.enabled : Boolean(stored.enabled),
    winEvery: Number.isFinite(winEvery) && winEvery >= 1 ? Math.min(50, Math.floor(winEvery)) : fallback.winEvery,
    sweepstakesOnLose: stored.sweepstakesOnLose !== false,
    sweepstakesMessage: String(stored.sweepstakesMessage || fallback.sweepstakesMessage),
    claimOffset: Math.max(0, Math.floor(Number(stored.claimOffset) || 0)),
    prizes: Array.isArray(stored.prizes) && stored.prizes.length
      ? stored.prizes.map(normalisePrize).filter((p) => p.name)
      : fallback.prizes,
    campaignName: campaign?.name || campaignId,
  };
}

function usesNthWinDemo(campaignId) {
  const control = getDemoControl(campaignId);
  return Boolean(control.enabled && control.winEvery >= 1);
}

function getClaimCount(campaignId) {
  if (!campaignId || campaignId === 'niterra-ngk-2026') {
    return db.prepare(`
      SELECT COUNT(*) as count FROM claims
      WHERE campaignId = ? OR campaignId IS NULL OR campaignId = ''
    `).get('niterra-ngk-2026').count;
  }
  return db.prepare('SELECT COUNT(*) as count FROM claims WHERE campaignId = ?').get(campaignId).count;
}

function nextEntryWins(campaignId) {
  const control = getDemoControl(campaignId);
  if (!control.enabled) return false;
  const count = getClaimCount(campaignId);
  const seq = count - control.claimOffset + 1;
  return seq > 0 && seq % control.winEvery === 0;
}

function isWinSlot(campaignId, claimCountAfterInsert) {
  const control = getDemoControl(campaignId);
  if (!control.enabled) return false;
  const seq = claimCountAfterInsert - control.claimOffset;
  return seq > 0 && seq % control.winEvery === 0;
}

function nominatedCatalog(campaignId) {
  const control = getDemoControl(campaignId);
  if (!control.prizes.length) return null;
  return {
    tier1: control.prizes.flatMap((p) => (
      Array.from({ length: p.qty }, () => ({ prizeName: p.name, value: p.value, image: p.image }))
    )),
    tier2: [],
    tier3: [],
  };
}

function saveCampaignConfig(campaignId, nextConfig) {
  db.prepare('UPDATE campaigns SET config = ? WHERE id = ?').run(JSON.stringify(nextConfig), campaignId);
}

function saveDemoControl(campaignId, patch, { reloadPool = true } = {}) {
  const campaign = loadCampaign(db, campaignId);
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.status = 404;
    throw err;
  }

  const current = getDemoControl(campaignId);
  const prizes = Array.isArray(patch.prizes)
    ? patch.prizes.map(normalisePrize).filter((p) => p.name)
    : current.prizes;

  if (!prizes.length) {
    const err = new Error('Nominate at least one prize');
    err.status = 400;
    throw err;
  }

  const winEvery = Number(patch.winEvery);
  const next = {
    enabled: patch.enabled !== false,
    winEvery: Number.isFinite(winEvery) && winEvery >= 1 ? Math.min(50, Math.floor(winEvery)) : current.winEvery,
    sweepstakesOnLose: patch.sweepstakesOnLose !== false,
    sweepstakesMessage: String(patch.sweepstakesMessage || current.sweepstakesMessage || DEFAULT_SWEEPSTAKES).trim(),
    claimOffset: patch.claimOffset != null
      ? Math.max(0, Math.floor(Number(patch.claimOffset) || 0))
      : current.claimOffset,
    prizes,
  };

  saveCampaignConfig(campaignId, { ...campaign.config, demoControl: next });

  let loaded = 0;
  if (reloadPool) loaded = loadNominatedIntoPool(campaignId, prizes);

  return { ...next, loaded, campaignName: campaign.name };
}

function resetSequence(campaignId) {
  const campaign = loadCampaign(db, campaignId);
  if (!campaign) {
    const err = new Error('Campaign not found');
    err.status = 404;
    throw err;
  }
  const current = getDemoControl(campaignId);
  const next = { ...current, enabled: true, claimOffset: getClaimCount(campaignId) };
  delete next.campaignName;
  saveCampaignConfig(campaignId, { ...campaign.config, demoControl: next });
  return getDemoControlStatus(campaignId);
}

function loadNominatedIntoPool(campaignId, prizes) {
  const list = (prizes || getDemoControl(campaignId).prizes).map(normalisePrize).filter((p) => p.name);
  db.prepare("DELETE FROM manifest WHERE campaignId = ? AND status = 'AVAILABLE'").run(campaignId);

  const now = Date.now();
  const insert = db.prepare(`
    INSERT INTO manifest
      (prizeId, tier, prizeName, value, winningTimestamp, winningWindowSeconds,
       status, assignedClaimId, seedHash, auditHash, createdAt, campaignId)
    VALUES (?, 1, ?, ?, ?, 86400, 'AVAILABLE', NULL, ?, ?, ?, ?)
  `);

  let loaded = 0;
  const maxQty = list.reduce((n, prize) => Math.max(n, prize.qty), 0);
  db.exec('BEGIN');
  try {
    for (let i = 0; i < maxQty; i += 1) {
      for (const prize of list) {
        if (i >= prize.qty) continue;
        const stamp = `${campaignId}:${prize.name}:${i}:${now}:${loaded}`;
        const hash = crypto.createHash('sha256').update(stamp).digest('hex');
        const prizeId = `PRIZE-DEMO-${hash.slice(0, 12).toUpperCase()}`;
        insert.run(
          prizeId,
          prize.name,
          prize.value,
          now,
          hash,
          hash.slice(12, 44),
          now + loaded,
          campaignId,
        );
        loaded += 1;
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return loaded;
}

function getDemoControlStatus(campaignId) {
  const control = getDemoControl(campaignId);
  const claimCount = getClaimCount(campaignId);
  const remaining = db.prepare(
    "SELECT COUNT(*) as c FROM manifest WHERE status = 'AVAILABLE' AND campaignId = ?"
  ).get(campaignId).c;
  return {
    campaignId,
    campaignName: control.campaignName,
    demoMode: process.env.DEMO_MODE === 'true',
    enabled: control.enabled,
    winEvery: control.winEvery,
    sweepstakesOnLose: control.sweepstakesOnLose,
    sweepstakesMessage: control.sweepstakesMessage,
    claimOffset: control.claimOffset,
    prizes: control.prizes,
    claimCount,
    remainingPrizes: remaining,
    nextIsWin: nextEntryWins(campaignId),
    sequencePosition: Math.max(0, claimCount - control.claimOffset),
  };
}

module.exports = {
  DEFAULT_SWEEPSTAKES,
  HOKA_DEFAULT_PRIZES,
  getDemoControl,
  getDemoControlStatus,
  usesNthWinDemo,
  isWinSlot,
  nominatedCatalog,
  saveDemoControl,
  resetSequence,
  loadNominatedIntoPool,
  getClaimCount,
};
