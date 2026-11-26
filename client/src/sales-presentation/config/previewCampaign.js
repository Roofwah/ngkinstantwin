/**
 * Phase 2 preview campaign artwork only.
 * Does not read or write demo_settings / device campaign APIs.
 */
export const PREVIEW_CAMPAIGN = {
  id: 'guinness-2026',
  name: 'Guinness Instant Win',
  exampleLabel: 'Guinness',
  idleVideo: '/campaigns/guinness/guinness.mp4',
  idleFallback: '/campaigns/guinness/bg.jpg',
  qrBg: '/campaigns/guinness/bg.jpg',
  enterPath: '/enter/guinness',
};

/**
 * Opaque share token for the sales presentation.
 * Live URL: /demo/{PRESENTATION_SHARE_HASH}
 */
export const PRESENTATION_SHARE_HASH = 'd90d312df3e8d421fabde78ae73934a7';

export function isPresentationCode(code) {
  return String(code || '').toLowerCase() === PRESENTATION_SHARE_HASH;
}
