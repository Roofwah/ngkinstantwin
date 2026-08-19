const { hasBirdConfig, getBirdEnv, isOtpDemoMode } = require('./otpMode');

function toE164Au(mobile) {
  const s = String(mobile || '').replace(/[\s\-()]/g, '');
  if (/^\+61/.test(s)) return s;
  if (/^04\d{8}$/.test(s)) return '+61' + s.slice(1);
  return s;
}

/**
 * Send a text SMS via Bird. Does not throw to the caller for winner notify —
 * returns { ok, skipped, error }. OTP route can still treat failure as fatal.
 */
async function sendBirdSms(mobile, text, { required = false } = {}) {
  if (isOtpDemoMode() && !required) {
    console.log(`[DEMO] SMS to ${mobile}: ${text}`);
    return { ok: true, skipped: true, demo: true };
  }

  if (!hasBirdConfig()) {
    console.warn(`[bird] not configured — SMS not sent to ${mobile}: ${text}`);
    return { ok: false, skipped: true, error: 'Bird not configured' };
  }

  const bird = getBirdEnv();
  const url = `https://api.bird.com/workspaces/${bird.workspaceId}/channels/${bird.channelId}/messages`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `AccessKey ${bird.accessKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      receiver: { contacts: [{ identifierValue: toE164Au(mobile) }] },
      body: { type: 'text', text: { text } },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data.message || data.error || `Bird HTTP ${response.status}`;
    return { ok: false, skipped: false, error };
  }
  return { ok: true, skipped: false, demo: false };
}

module.exports = { sendBirdSms, toE164Au };
