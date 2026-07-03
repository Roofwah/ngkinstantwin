/**
 * Public base URL for QR links (/t/{token}).
 * Priority: BASE_URL → RAILWAY_STATIC_URL → RAILWAY_PUBLIC_DOMAIN → RENDER_EXTERNAL_URL → localhost
 */
function normalizeBaseUrl(url) {
  const trimmed = (url || '').replace(/\/$/, '');
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getBaseUrl() {
  if (process.env.BASE_URL) {
    return normalizeBaseUrl(process.env.BASE_URL);
  }
  if (process.env.RAILWAY_STATIC_URL) {
    return normalizeBaseUrl(process.env.RAILWAY_STATIC_URL);
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return normalizeBaseUrl(process.env.RAILWAY_PUBLIC_DOMAIN);
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return normalizeBaseUrl(process.env.RENDER_EXTERNAL_URL);
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

module.exports = { getBaseUrl, getPublicBaseUrlWarning };
