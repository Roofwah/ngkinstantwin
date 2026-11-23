const { hasBirdConfig, getBirdEnv, isOtpDemoMode } = require('./otpMode');
const {
  resolveRegion,
  toE164ForRegion,
  birdChannelIdForRegion,
} = require('./regions');

/** @deprecated Prefer toE164ForRegion(mobile, 'AU') */
function toE164Au(mobile) {
  return toE164ForRegion(mobile, 'AU');
}

/**
 * Send a text SMS via Bird. Does not throw to the caller for winner notify —
 * returns { ok, skipped, error }. OTP route can still treat failure as fatal.
 *
 * @param {string} mobile
 * @param {string} text
 * @param {{ required?: boolean, region?: string }} [opts]
 */
async function sendBirdSms(mobile, text, { required = false, region = 'AU' } = {}) {
  const regionInfo = resolveRegion(region);

  if (isOtpDemoMode() && !required) {
    console.log(`[DEMO] SMS (${regionInfo.id}) to ${mobile}: ${text}`);
    return { ok: true, skipped: true, demo: true };
  }

  if (!hasBirdConfig()) {
    console.warn(`[bird] not configured — SMS not sent to ${mobile}: ${text}`);
    return { ok: false, skipped: true, error: 'Bird not configured' };
  }

  const channelId = birdChannelIdForRegion(regionInfo.id);
  if (!channelId) {
    const error = `Bird channel not configured for region ${regionInfo.id} (${regionInfo.birdChannelEnv})`;
    console.warn(`[bird] ${error}`);
    return { ok: false, skipped: true, error };
  }

  const bird = getBirdEnv();
  const e164 = toE164ForRegion(mobile, regionInfo.id);
  const url = `https://api.bird.com/workspaces/${bird.workspaceId}/channels/${channelId}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `AccessKey ${bird.accessKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receiver: { contacts: [{ identifierValue: e164 }] },
      body: { type: 'text', text: { text } },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data.message || data.error || `Bird HTTP ${response.status}`;
    return { ok: false, skipped: false, error };
  }
  return { ok: true, skipped: false, demo: false, region: regionInfo.id };
}

module.exports = { sendBirdSms, toE164Au, toE164ForRegion };
