/**
 * Public base URL for QR links (/t/{token}).
 * Priority: BASE_URL → RAILWAY_STATIC_URL → RAILWAY_PUBLIC_DOMAIN → RENDER_EXTERNAL_URL → localhost
 */
function getBaseUrl() {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/$/, '');
  }
  if (process.env.RAILWAY_STATIC_URL) {
    return process.env.RAILWAY_STATIC_URL.replace(/\/$/, '');
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN.replace(/\/$/, '')}`;
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
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
