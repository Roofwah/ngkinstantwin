/**
 * Web PUK simulator hardware profiles.
 * Token / campaign logic stays shared; only chassis + LCD geometry change.
 *
 * Wrist AMOLED — Waveshare ESP32-S3-Touch-AMOLED-2.06 (410×502)
 * PUK2         — portrait 320×480 panel
 */

export const DEFAULT_PUK_HARDWARE_ID = 'waveshare-206';

const WAVESHARE_BODY_W = 400;
const WAVESHARE_SCALE = WAVESHARE_BODY_W / 1147;

export const PUK_HARDWARE = {
  'waveshare-206': {
    id: 'waveshare-206',
    label: 'Waveshare 2.06 AMOLED',
    shortLabel: 'Wrist PUK',
    chip: 'ESP32-S3',
    display: '410 × 502 AMOLED',
    deviceCode: 'PR-DEMO-001',
    form: 'wrist',
    bodySrc: '/device/puk-body.png',
    glassSrc: '/device/puk-glass.png',
    bodyW: WAVESHARE_BODY_W,
    bodyH: Math.round(WAVESHARE_BODY_W * (1372 / 1147)),
    bodyR: 70,
    screen: {
      top: Math.round(228 * WAVESHARE_SCALE),
      left: Math.round(217 * WAVESHARE_SCALE),
      width: Math.round(749 * WAVESHARE_SCALE),
      height: Math.round(917 * WAVESHARE_SCALE),
      radius: 28,
    },
    lcdW: 410,
    lcdH: 502,
    qrScale: 0.82,
    hasLed: true,
    btnPwr: { topOffset: 56, right: 0, w: 24, h: 52 },
  },

  puk2: {
    id: 'puk2',
    label: 'PUK2',
    shortLabel: 'PUK2',
    chip: 'ESP32-S3',
    display: '320 × 480 portrait',
    deviceCode: 'PR-PUK2-001',
    form: 'panel',
    bodySrc: null,
    glassSrc: null,
    bodyW: 356,
    bodyH: 536,
    bodyR: 16,
    screen: {
      top: 22,
      left: 18,
      width: 320,
      height: 480,
      radius: 6,
    },
    lcdW: 320,
    lcdH: 480,
    qrScale: 0.70,
    hasLed: false,
    btnPwr: null,
  },
};

const HARDWARE_ALIASES = {
  'wt32-sc01-plus': 'puk2',
};

export function listPukHardware() {
  return Object.values(PUK_HARDWARE);
}

export function getPukHardware(id) {
  const resolved = HARDWARE_ALIASES[id] || id;
  return PUK_HARDWARE[resolved] || PUK_HARDWARE[DEFAULT_PUK_HARDWARE_ID];
}

export function pukHardwarePath(id) {
  if (!id || id === DEFAULT_PUK_HARDWARE_ID) return '/demo/device';
  return `/demo/device/${id}`;
}
