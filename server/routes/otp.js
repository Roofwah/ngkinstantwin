const express = require('express');
const router = express.Router();
const { isOtpDemoMode, getOtpMode, birdEnvStatus } = require('../lib/otpMode');
const { sendBirdSms } = require('../lib/birdSms');
const {
  resolveRegion,
  normaliseMobileForRegion,
  isValidMobileForRegion,
  birdChannelIdForRegion,
  birdSmsReadyForRegion,
} = require('../lib/regions');

// In-memory OTP store: `${region}:${mobile}` -> { code, expiresAt, attempts }
const otpStore = new Map();

const DEMO_CODE = '123456';
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function otpKey(regionId, mobile) {
  return `${regionId}:${mobile}`;
}

// GET /api/otp/status — safe diagnostic (no secret values)
router.get('/status', (req, res) => {
  const bird = birdEnvStatus();
  res.json({
    mode: getOtpMode(),
    demo: isOtpDemoMode(),
    bird,
    channels: {
      AU: Boolean(birdChannelIdForRegion('AU')),
      NZ: Boolean(birdChannelIdForRegion('NZ')),
      US: Boolean(birdChannelIdForRegion('US')),
    },
    smsReady: {
      AU: birdSmsReadyForRegion('AU'),
      NZ: birdSmsReadyForRegion('NZ'),
      US: birdSmsReadyForRegion('US'),
    },
    ready: bird.accessKey && bird.workspaceId && bird.channelId,
  });
});

// POST /api/otp/send
router.post('/send', async (req, res) => {
  const region = resolveRegion(req.body?.region);
  const mobile = normaliseMobileForRegion(req.body?.mobile, region.id);

  if (!isValidMobileForRegion(mobile, region.id)) {
    return res.status(400).json({ error: region.invalidMobileMessage });
  }

  const regionReady = birdSmsReadyForRegion(region.id);
  const useDemo = isOtpDemoMode() || !regionReady;
  const code = useDemo ? DEMO_CODE : generateCode();
  otpStore.set(otpKey(region.id, mobile), {
    code,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    region: region.id,
  });

  if (useDemo) {
    const reason = isOtpDemoMode() ? 'otp_demo_mode' : 'region_sms_not_configured';
    console.log(`[DEMO] OTP (${region.id}/${reason}) for ${mobile}: ${code}`);
    return res.json({ sent: true, demo: true, region: region.id, reason });
  }

  try {
    const sms = await sendBirdSms(
      mobile,
      `Your PUK Instant Win code is: ${code}. Valid for 10 minutes.`,
      { required: true, region: region.id },
    );
    if (!sms.ok) throw new Error(sms.error || 'SMS send failed');
    res.json({ sent: true, demo: false, region: region.id });
  } catch (err) {
    console.error('Bird SMS error:', err.message);
    res.status(500).json({ error: 'Failed to send SMS. Please try again.' });
  }
});

// POST /api/otp/verify
router.post('/verify', (req, res) => {
  const region = resolveRegion(req.body?.region);
  const mobile = normaliseMobileForRegion(req.body?.mobile, region.id);
  const { code } = req.body;

  if (!mobile || !code) {
    return res.status(400).json({ error: 'Mobile and code are required' });
  }

  const record = otpStore.get(otpKey(region.id, mobile));
  if (!record) {
    return res.status(400).json({ error: 'No code sent to this number. Please request a new code.' });
  }
  if (Date.now() > record.expiresAt) {
    otpStore.delete(otpKey(region.id, mobile));
    return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(otpKey(region.id, mobile));
    return res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
  }

  record.attempts += 1;

  if (code.trim() !== record.code) {
    const remaining = MAX_ATTEMPTS - record.attempts;
    return res.status(400).json({
      error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    });
  }

  otpStore.delete(otpKey(region.id, mobile));
  res.json({ verified: true, region: region.id });
});

module.exports = router;
