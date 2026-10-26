import { QRCodeSVG } from 'qrcode.react';

/** Winning code the customer shows to staff. The value is the fulfilment URL. */
export default function StaffWinCode({ url, store }) {
  if (!url) return null;
  return (
    <div style={{ marginTop: 20, textAlign: 'center' }}>
      <p style={{ margin: '0 0 10px' }}>
        Show this code to staff{store ? ` at ${store}` : ''}.
      </p>
      <div style={{ display: 'inline-block', background: '#ffffff', padding: 8, lineHeight: 0 }}>
        <QRCodeSVG value={url} size={196} includeMargin={false} />
      </div>
    </div>
  );
}
