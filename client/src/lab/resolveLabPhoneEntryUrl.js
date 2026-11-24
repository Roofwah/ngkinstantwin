/**
 * Lab phone iframe must load the campaign-specific entry route (not generic /enter),
 * so the correct form always shows even if the global demo campaign differs.
 */
export function resolveLabPhoneEntryUrl(session, config) {
  if (!session?.sessionId) return null;

  const path = config?.phoneEntryPath || '/enter';
  const params = new URLSearchParams({ labSession: session.sessionId });

  const device = config?.deviceCode || session.deviceCode;
  if (device) params.set('device', device);

  if (path === '/enter' && (config?.campaignId || session.campaignId)) {
    params.set('campaign', config?.campaignId || session.campaignId);
  }

  return `${window.location.origin}${path}?${params.toString()}`;
}
