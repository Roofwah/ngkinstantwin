const DEMO_DEVICE_CODES = new Set(['PR-DEMO-001', 'PR-UNIT-001']);
const SETTINGS_KEY = 'activeCampaignId';
const DEFAULT_CAMPAIGN_ID = 'niterra-ngk-2026';

const DEMO_CAMPAIGN_IDS = [
  'niterra-ngk-2026',
  'castrol-2026',
  'cocacola-2026',
  'vb-2026',
  'redbull-2026',
];

function isDemoDevice(deviceCode) {
  return DEMO_DEVICE_CODES.has(deviceCode);
}

function parseConfig(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function getActiveDemoCampaignId(db) {
  const row = db.prepare('SELECT value FROM demo_settings WHERE key = ?').get(SETTINGS_KEY);
  return row?.value || DEFAULT_CAMPAIGN_ID;
}

function setActiveDemoCampaignId(db, campaignId) {
  const campaign = db.prepare('SELECT id FROM campaigns WHERE id = ? AND status = ?').get(campaignId, 'active');
  if (!campaign) {
    throw new Error('Unknown or inactive campaign');
  }
  db.prepare(`
    INSERT INTO demo_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(SETTINGS_KEY, campaignId);
  return campaignId;
}

function resolveCampaignId(db, device) {
  if (isDemoDevice(device.deviceCode)) {
    return getActiveDemoCampaignId(db);
  }
  return device.campaignId;
}

function loadCampaign(db, campaignId) {
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    tagline: row.tagline,
    mechanic: row.mechanic,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status,
    config: parseConfig(row.config),
  };
}

function listDemoCampaigns(db) {
  const placeholders = DEMO_CAMPAIGN_IDS.map(() => '?').join(', ');
  const rows = db.prepare(`
    SELECT * FROM campaigns
    WHERE id IN (${placeholders}) AND status = 'active'
    ORDER BY name
  `).all(...DEMO_CAMPAIGN_IDS);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    tagline: row.tagline,
    config: parseConfig(row.config),
  }));
}

function campaignBrandOptions(campaign) {
  const brands = campaign?.config?.eligibleBrands;
  if (Array.isArray(brands) && brands.length > 0) return brands;
  return ['Other'];
}

module.exports = {
  DEMO_DEVICE_CODES,
  DEFAULT_CAMPAIGN_ID,
  isDemoDevice,
  getActiveDemoCampaignId,
  setActiveDemoCampaignId,
  resolveCampaignId,
  loadCampaign,
  listDemoCampaigns,
  campaignBrandOptions,
};
