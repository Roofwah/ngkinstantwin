const express = require('express');
const router = express.Router();
const { isOtpDemoMode, getOtpMode, birdEnvStatus } = require('../lib/otpMode');

// In-memory OTP store: mobile -> { code, expiresAt, attempts }
const otpStore = new Map();

const DEMO_CODE = '123456';
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function toE164(mobile) {
  // mobile is already normalised to 04XXXXXXXX
  return '+61' + mobile.slice(1);
}

const { getBirdEnv } = require('../lib/otpMode');

// GET /api/otp/status — safe diagnostic (no secret values)
router.get('/status', (req, res) => {
  const bird = birdEnvStatus();
  res.json({
    mode: getOtpMode(),
    demo: isOtpDemoMode(),
    bird,
    ready: bird.accessKey && bird.workspaceId && bird.channelId,
  });
});

// POST /api/otp/send
router.post('/send', async (req, res) => {
  const { mobile } = req.body;
  if (!mobile || !/^04\d{8}$/.test(mobile)) {
    return res.status(400).json({ error: 'Valid Australian mobile required' });
  }

  const code = isOtpDemoMode() ? DEMO_CODE : generateCode();
  otpStore.set(mobile, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });

  if (isOtpDemoMode()) {
    console.log(`[DEMO] OTP for ${mobile}: ${code}`);
    return res.json({ sent: true, demo: true });
  }

  try {
    const bird = getBirdEnv();
    const url = `https://api.bird.com/workspaces/${bird.workspaceId}/channels/${bird.channelId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `AccessKey ${bird.accessKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiver: { contacts: [{ identifierValue: toE164(mobile) }] },
        body: { type: 'text', text: { text: `Your FLOW Mktg code is: ${code}. Valid for 10 minutes.` } },
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'SMS send failed');
    res.json({ sent: true, demo: false });
  } catch (err) {
    console.error('Bird SMS error:', err.message);
    res.status(500).json({ error: 'Failed to send SMS. Please try again.' });
  }
});

// POST /api/otp/verify
router.post('/verify', (req, res) => {
  const { mobile, code } = req.body;
  if (!mobile || !code) {
    return res.status(400).json({ error: 'Mobile and code are required' });
  }

  const record = otpStore.get(mobile);
  if (!record) {
    return res.status(400).json({ error: 'No code sent to this number. Please request a new code.' });
  }
  if (Date.now() > record.expiresAt) {
    otpStore.delete(mobile);
    return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(mobile);
    return res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
  }

  record.attempts += 1;

  if (code.trim() !== record.code) {
    const remaining = MAX_ATTEMPTS - record.attempts;
    return res.status(400).json({ error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` });
  }

  otpStore.delete(mobile);
  res.json({ verified: true });
});

module.exports = router;
