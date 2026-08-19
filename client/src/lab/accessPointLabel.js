/** Display label for a QR access point linked to a store. */
export function formatAccessPointLabel({ storeId, storeLocation, accessPointId } = {}) {
  if (storeId && storeLocation) return `${storeId} ${storeLocation}`;
  if (storeId) return String(storeId);
  if (storeLocation) return storeLocation;
  return accessPointId || null;
}

export function resolveAccessPointFromConfig(config) {
  const ap = config?.accessPoint || {};
  return {
    accessPointId: config?.accessPointId || ap.qrId || null,
    storeId: ap.storeId || null,
    storeLocation: ap.location || null,
  };
}
