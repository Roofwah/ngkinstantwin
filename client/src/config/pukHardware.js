/**
 * Web PUK simulator hardware profile.
 * Physical unit: WT32-SC01 Plus (PUK2) — 320×480 portrait panel.
 */

export const DEFAULT_PUK_HARDWARE_ID = 'puk2';

export const PUK_HARDWARE = {
  puk2: {
    id: 'puk2',
    label: 'PUK2',
    shortLabel: 'PUK',
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
  // Retired wrist unit — same sim profile as desk PUK
  'waveshare-206': 'puk2',
};

export function listPukHardware() {
  return Object.values(PUK_HARDWARE);
}

export function getPukHardware(id) {
  const resolved = HARDWARE_ALIASES[id] || id || DEFAULT_PUK_HARDWARE_ID;
  return PUK_HARDWARE[resolved] || PUK_HARDWARE[DEFAULT_PUK_HARDWARE_ID];
}

export function pukHardwarePath(id) {
  const hw = getPukHardware(id);
  if (hw.id === DEFAULT_PUK_HARDWARE_ID) return '/demo/device';
  return `/demo/device/${hw.id}`;
}
