const {
  hasBirdConfig,
  getBirdEnv,
  isOtpDemoMode,
  hasBirdUsPlatformConfig,
  getBirdUsPlatformEnv,
} = require('./otpMode');
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
 * US SMS via Bird platform API (same surface as @messagebird/sdk bird.sms.send).
 * Explicit `from` so OTP originates from the approved toll-free, not a system sender.
 */
async function sendUsPlatformSms(e164, text) {
  if (!hasBirdUsPlatformConfig()) {
    return {
      ok: false,
      skipped: true,
      error: 'Bird US platform SMS not configured (BIRD_API_KEY + BIRD_SMS_FROM_US)',
    };
  }

  const { apiKey, from, baseUrl } = getBirdUsPlatformEnv();
  const url = `${baseUrl}/v1/sms/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      to: e164,
      from,
      text,
      category: 'authentication',
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errObj = data.error || data;
    const error =
      (errObj && (errObj.message || errObj.code || errObj.name)) ||
      data.message ||
      `Bird platform HTTP ${response.status}`;
    return { ok: false, skipped: false, error: String(error) };
  }
  return { ok: true, skipped: false, demo: false, region: 'US', provider: 'bird-platform' };
}

/**
 * AU/NZ SMS via Bird Channels API (existing integration).
 */
async function sendChannelsSms(regionInfo, e164, text) {
  if (!hasBirdConfig()) {
    console.warn(`[bird] not configured — SMS not sent to ${e164}: ${text}`);
    return { ok: false, skipped: true, error: 'Bird not configured' };
  }

  const channelId = birdChannelIdForRegion(regionInfo.id);
  if (!channelId) {
    const error = `Bird channel not configured for region ${regionInfo.id} (${regionInfo.birdChannelEnv})`;
    console.warn(`[bird] ${error}`);
    return { ok: false, skipped: true, error };
  }

  const bird = getBirdEnv();
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
  return { ok: true, skipped: false, demo: false, region: regionInfo.id, provider: 'bird-channels' };
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

  const e164 = toE164ForRegion(mobile, regionInfo.id);

  if (regionInfo.id === 'US') {
    return sendUsPlatformSms(e164, text);
  }

  return sendChannelsSms(regionInfo, e164, text);
}

module.exports = { sendBirdSms, toE164Au, toE164ForRegion };
