const HOKA_CAMPAIGN_ID = 'hoka-2026';
const HOKA_DEVICE_CODE = 'PR-PUK2-001';
const HOKA_STORE_NAME = 'Cotswold Outdoor Birmingham';
const DEFAULT_MIN_SPEND = 50;
const PURCHASE_BACK_CAP = 200;

function isHokaCampaign(campaign) {
  if (!campaign) return false;
  if (campaign.id === HOKA_CAMPAIGN_ID) return true;
  return campaign.config?.entryVariant === 'hoka-cotswold';
}

function isHokaDevice(deviceCode) {
  return deviceCode === HOKA_DEVICE_CODE;
}

function isInstantWin(result) {
  return Boolean(result) && result !== 'NOT_WINNER';
}

function hokaMinSpend(campaign) {
  const n = Number(campaign?.config?.minSpend);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MIN_SPEND;
}

function formatSpendAmount(spendAmount) {
  const spend = Number(spendAmount) || 0;
  return `$${Math.min(spend, PURCHASE_BACK_CAP).toFixed(0)}`;
}

function formatNominatedPrizeName(name, spendAmount) {
  if (!name) return null;
  const amount = formatSpendAmount(spendAmount);
  if (/\{spend\}/i.test(name)) return name.replace(/\{spend\}/gi, amount);
  if (/^hoka purchase back$/i.test(name.trim())) return `${amount} HOKA purchase back`;
  return name;
}

function hokaPrizeName(campaign, result, spendAmount, prize) {
  if (!isInstantWin(result)) return null;
  const nominated = formatNominatedPrizeName(prize?.prizeName, spendAmount);
  if (nominated) return nominated;
  const byResult = campaign?.config?.prizeByResult || {};
  if (typeof byResult[result] === 'string' && byResult[result] && byResult[result] !== 'purchase_back') {
    return byResult[result];
  }
  if (result === 'TIER_2_PROVISIONAL_WIN') return 'HOKA Run Cap';
  if (result === 'TIER_3_PROVISIONAL_WIN') return 'HOKA Run Belt';
  return 'HOKA Crew Socks';
}

function maskMobile(mobile) {
  const s = String(mobile || '');
  if (s.length < 6) return '****';
  return `${s.slice(0, 4)}****${s.slice(-2)}`;
}

module.exports = {
  HOKA_CAMPAIGN_ID,
  HOKA_DEVICE_CODE,
  HOKA_STORE_NAME,
  isHokaCampaign,
  isHokaDevice,
  isInstantWin,
  hokaMinSpend,
  hokaPrizeName,
  formatNominatedPrizeName,
  maskMobile,
};
