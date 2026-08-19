import { QRCodeSVG } from 'qrcode.react';
import { formatAccessPointLabel, resolveAccessPointFromConfig } from '../accessPointLabel';

export default function StaticQrAccess({ entryUrl, config }) {
  const ap = resolveAccessPointFromConfig(config);
  const label = formatAccessPointLabel(ap);

  return (
    <div className="lab-access-qr">
      <QRCodeSVG value={entryUrl || ''} size={168} level="M" includeMargin={false} />
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', textAlign: 'center' }}>
          {label || `${config?.retailer || 'Retailer'} — Static QR`}
        </div>
        <div className="lab-access-qr__code">
          {ap.accessPointId || '—'}
        </div>
      </div>
      <div className="lab-access-qr__url">{entryUrl}</div>
    </div>
  );
}
