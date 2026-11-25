/** OTP delivery mode: Bird SMS when configured, otherwise demo (123456). */

function env(name) {
  const v = process.env[name];
  return typeof v === 'string' ? v.trim() : '';
}

function birdEnvStatus() {
  return {
    accessKey: env('BIRD_ACCESS_KEY').length > 0,
    workspaceId: env('BIRD_WORKSPACE_ID').length > 0,
    channelId: env('BIRD_CHANNEL_ID').length > 0,
    /** Newer Bird platform API key (bk_…) for US SMS — separate from Channels AccessKey */
    apiKey: env('BIRD_API_KEY').length > 0,
    smsFromUs: env('BIRD_SMS_FROM_US').length > 0,
  };
}

function hasBirdConfig() {
  const s = birdEnvStatus();
  return s.accessKey && s.workspaceId && s.channelId;
}

/** US OTP uses platform API key + explicit toll-free sender (not Channels UUID). */
function hasBirdUsPlatformConfig() {
  const s = birdEnvStatus();
  return s.apiKey && s.smsFromUs;
}

function getBirdUsPlatformEnv() {
  const apiKey = env('BIRD_API_KEY');
  const from = env('BIRD_SMS_FROM_US');
  // Region from bk_{region}_… (e.g. bk_eu1_…)
  const parts = apiKey.split('_');
  const region = parts.length >= 3 && parts[0] === 'bk' ? parts[1] : 'eu1';
  return {
    apiKey,
    from,
    region,
    baseUrl: `https://${region}.platform.bird.com`,
  };
}

function isOtpDemoMode() {
  if (process.env.OTP_DEMO_MODE === 'true') return true;
  if (process.env.OTP_DEMO_MODE === 'false') return false;
  return !hasBirdConfig();
}

function getOtpMode() {
  return isOtpDemoMode() ? 'demo' : 'bird';
}

function getBirdEnv() {
  return {
    accessKey: env('BIRD_ACCESS_KEY'),
    workspaceId: env('BIRD_WORKSPACE_ID'),
    channelId: env('BIRD_CHANNEL_ID'),
  };
}

module.exports = {
  birdEnvStatus,
  hasBirdConfig,
  hasBirdUsPlatformConfig,
  getBirdUsPlatformEnv,
  isOtpDemoMode,
  getOtpMode,
  getBirdEnv,
};

