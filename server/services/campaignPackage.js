const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { getBaseUrl } = require('../lib/baseUrl');

const PACKAGES_ROOT = path.join(__dirname, '../public/campaign-packages');
const SLIDE_COUNT = 4;

function packageDir(campaignId) {
  return path.join(PACKAGES_ROOT, campaignId);
}

function slideFiles(campaignId) {
  const dir = packageDir(campaignId);
  const slides = [];
  for (let i = 1; i <= SLIDE_COUNT; i++) {
    const filePath = path.join(dir, `slide${i}.jpg`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath);
    slides.push({
      index: i,
      file: `slide${i}.jpg`,
      url: `${getBaseUrl()}/campaign-packages/${campaignId}/slide${i}.jpg`,
      sha256: crypto.createHash('sha256').update(data).digest('hex'),
      bytes: data.length,
    });
  }
  return slides;
}

function packageVersion(campaignId, slides) {
  const hash = crypto.createHash('sha256');
  hash.update(campaignId);
  for (const slide of slides) {
    hash.update(slide.sha256);
  }
  return `${campaignId}-${hash.digest('hex').slice(0, 12)}`;
}

function buildCampaignPackage(campaign) {
  if (!campaign) return null;
  const slides = slideFiles(campaign.id);
  if (!slides) return null;

  return {
    version: packageVersion(campaign.id, slides),
    campaignId: campaign.id,
    name: campaign.name,
    brand: campaign.brand,
    tagline: campaign.tagline,
    themeColor: campaign.config?.themeColor || '#00c8ff',
    slideCount: slides.length,
    slides,
  };
}

function listAvailablePackageIds() {
  if (!fs.existsSync(PACKAGES_ROOT)) return [];
  return fs.readdirSync(PACKAGES_ROOT).filter((name) => {
    const dir = path.join(PACKAGES_ROOT, name);
    return fs.statSync(dir).isDirectory() && slideFiles(name);
  });
}

module.exports = {
  PACKAGES_ROOT,
  buildCampaignPackage,
  listAvailablePackageIds,
};
