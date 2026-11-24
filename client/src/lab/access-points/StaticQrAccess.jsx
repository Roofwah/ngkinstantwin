import { QRCodeSVG } from 'qrcode.react';
import { formatAccessPointLabel, resolveAccessPointFromConfig } from '../accessPointLabel';

export default function StaticQrAccess({ entryUrl, config }) {
  const ap = resolveAccessPointFromConfig(config);
  const label = formatAccessPointLabel(ap);

  return (
    <div className="lab-access-qr">
      <QRCodeSVG value={entryUrl || ''} size={96} level="M" includeMargin={false} />
      <div className="lab-access-puk__label">
        {label || `${config?.retailer || 'Retailer'} — Static QR`}
      </div>
      <div className="lab-access-qr__code">
        {ap.accessPointId || '—'}
      </div>
      {entryUrl && <div className="lab-access-qr__url">{entryUrl}</div>}
    </div>
  );
}
