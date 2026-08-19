import niterraRepco from './niterra-repco';

/** Registry of lab presenter configs — add one file per promotional program. */
const LAB_CAMPAIGNS = {
  'niterra-repco': niterraRepco,
};

const DEFAULT_CONFIG_ID = 'niterra-repco';

export function getLabCampaign(configId) {
  if (!configId) return null;
  return LAB_CAMPAIGNS[configId] || null;
}

export function listLabCampaigns() {
  return Object.values(LAB_CAMPAIGNS);
}

export function listLabCampaignIds() {
  return Object.keys(LAB_CAMPAIGNS);
}

export function getDefaultLabCampaign() {
  return LAB_CAMPAIGNS[DEFAULT_CONFIG_ID] || listLabCampaigns()[0] || null;
}

/** Resolve presenter config from session metadata (display / resume). */
export function resolveLabCampaign({ configId, campaignId } = {}) {
  if (configId && LAB_CAMPAIGNS[configId]) {
    return LAB_CAMPAIGNS[configId];
  }
  if (campaignId) {
    const match = listLabCampaigns().find((c) => c.campaignId === campaignId);
    if (match) return match;
  }
  return getDefaultLabCampaign();
}

export { niterraRepco };
