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
  };
}

function hasBirdConfig() {
  const s = birdEnvStatus();
  return s.accessKey && s.workspaceId && s.channelId;
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
  isOtpDemoMode,
  getOtpMode,
  getBirdEnv,
};

