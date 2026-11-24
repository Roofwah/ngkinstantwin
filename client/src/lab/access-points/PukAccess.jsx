import { formatAccessPointLabel, resolveAccessPointFromConfig } from '../accessPointLabel';

/** PUK desk unit — double-tap on physical panel issues demo QR; Lab phone runs the journey. */
export default function PukAccess({ config }) {
  const ap = resolveAccessPointFromConfig(config);
  const label = formatAccessPointLabel(ap);
  const deviceCode = config?.deviceCode || 'PR-PUK2-001';

  return (
    <div className="lab-access-puk">
      <div className="lab-access-puk__label">
        {label || `${config?.retailer || 'Store'} — PUK desk unit`}
      </div>
      <div className="lab-access-qr__code">{deviceCode}</div>
    </div>
  );
}
