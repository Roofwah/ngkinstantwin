const os = require('os');

/**
 * Public base URL for QR links (/t/{token}).
 * Customer-facing links use https://www.pukqr.com. A Railway hostname is never encoded.
 * Local dev with no public host stays on localhost.
 */
const PUBLIC_QR_ORIGIN = 'https://www.pukqr.com';

function isRailwayHost(url) {
  return /railway\.app/i.test(url || '');
}
function normalizeBaseUrl(url) {
  const trimmed = (url || '').replace(/\/$/, '');
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getLanIpv4() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        candidates.push(net.address);
      }
    }
  }
  // Prefer typical home/office Wi‑Fi ranges
  return (
    candidates.find((ip) => ip.startsWith('192.168.')) ||
    candidates.find((ip) => ip.startsWith('10.')) ||
    candidates.find((ip) => ip.startsWith('172.')) ||
    candidates[0] ||
    null
  );
}

/**
 * URL customers open in the browser (SPA). In Vite dev this is port 5173, not the API port.
 * Uses the presenter's browser origin when possible; swaps localhost for LAN IP for phone QR scans.
 */
function resolveClientBaseUrl(clientOrigin) {
  if (process.env.BASE_URL) {
    return normalizeBaseUrl(process.env.BASE_URL);
  }

  const devPort = process.env.CLIENT_DEV_PORT || '5173';

  if (clientOrigin) {
    try {
      const url = new URL(clientOrigin);
      const port = url.port || (url.protocol === 'https:' ? '443' : '80');
      const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
      if (isLocal && process.env.NODE_ENV !== 'production') {
        const lan = getLanIpv4();
        if (lan) {
          return `http://${lan}:${port === '80' ? devPort : port}`;
        }
      }
      return clientOrigin.replace(/\/$/, '');
    } catch {
      /* fall through */
    }
  }

  const lan = getLanIpv4();
  if (lan && process.env.NODE_ENV !== 'production') {
    return `http://${lan}:${devPort}`;
  }

  return getBaseUrl();
}

function getLabNetworkHint() {
  const lan = getLanIpv4();
  const devPort = process.env.CLIENT_DEV_PORT || '5173';
  if (!lan) return null;
  return {
    lanIp: lan,
    phoneBaseUrl: `http://${lan}:${devPort}`,
    note: 'Keep Lab on localhost. Phone and QR use your network IP automatically.',
  };
}

function getBaseUrl() {
  if (process.env.BASE_URL && !isRailwayHost(process.env.BASE_URL)) {
    return normalizeBaseUrl(process.env.BASE_URL);
  }
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    process.env.RAILWAY_STATIC_URL ||
    process.env.RENDER_EXTERNAL_URL
  ) {
    return PUBLIC_QR_ORIGIN;
  }
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
}

function getPublicBaseUrlWarning() {
  if (process.env.NODE_ENV !== 'production') return null;
  if (
    process.env.BASE_URL ||
    process.env.RAILWAY_STATIC_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    process.env.RENDER_EXTERNAL_URL
  ) {
    return null;
  }
  return 'BASE_URL is not set — set it to your public HTTPS URL so QR codes work on customer phones';
}

module.exports = {
  getBaseUrl,
  getPublicBaseUrlWarning,
  resolveClientBaseUrl,
  getLanIpv4,
  getLabNetworkHint,
};
