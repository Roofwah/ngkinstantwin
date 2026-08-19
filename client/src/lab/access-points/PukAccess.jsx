/** PUK access point — stub for future Cotswold-style campaigns */
export default function PukAccess({ config }) {
  return (
    <div className="lab-access-puk">
      <div style={{ fontSize: '2rem', marginBottom: 8 }}>⌚</div>
      <div style={{ fontWeight: 700, color: '#f4f7fb', marginBottom: 6 }}>PUK Access Point</div>
      <p style={{ margin: 0 }}>
        {config?.campaignName || 'Campaign'} — wrist device issues dynamic QR.
      </p>
      <p style={{ margin: '8px 0 0', fontSize: '0.78rem' }}>
        Configure <code style={{ color: '#00c8ff' }}>accessPointType: &apos;puk&apos;</code> to enable.
      </p>
    </div>
  );
}
