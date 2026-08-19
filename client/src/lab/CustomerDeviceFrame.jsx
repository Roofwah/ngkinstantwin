import { useState, useEffect } from 'react';
import CustomerLivePanel from './CustomerLivePanel';

const PHONE_STAGES = new Set([
  'entry_opened', 'otp_sent', 'customer_verified', 'receipt_received',
  'reading_receipt', 'purchase_validated', 'submitting', 'checking_instant_win',
  'instant_win_outcome', 'prize_allocated', 'reporting',
]);

/**
 * Embedded customer journey in a phone frame — for Teams/Meet screen share.
 * Toggle on-screen demo vs participant scanning QR on their own phone.
 */
export default function CustomerDeviceFrame({
  session,
  config,
  entryUrl,
  autoEmbed = false,
}) {
  const [embedActive, setEmbedActive] = useState(autoEmbed);
  const [iframeSrc, setIframeSrc] = useState(autoEmbed ? entryUrl : null);

  useEffect(() => {
    if (autoEmbed && entryUrl) {
      setEmbedActive(true);
      setIframeSrc(entryUrl);
    }
  }, [autoEmbed, entryUrl]);

  const remoteActive = !embedActive && PHONE_STAGES.has(session?.stage);
  const stage = session?.stageLabel || 'Ready to begin';

  function startEmbed() {
    setEmbedActive(true);
    setIframeSrc(entryUrl);
  }

  function stopEmbed() {
    setEmbedActive(false);
    setIframeSrc(null);
  }

  return (
    <div className="lab-device-column">
      <div className="lab-device-column__header">
        <span className="lab-device-column__eyebrow">Customer experience</span>
        <span className="lab-device-column__title">
          {embedActive ? 'On-screen demo' : remoteActive ? 'Participant phone' : 'Customer device'}
        </span>
      </div>

      <div className="lab-device-mode">
        <button
          type="button"
          className={`lab-device-mode__btn${embedActive ? ' lab-device-mode__btn--active' : ''}`}
          onClick={startEmbed}
        >
          On-screen demo
        </button>
        <button
          type="button"
          className={`lab-device-mode__btn${!embedActive ? ' lab-device-mode__btn--active' : ''}`}
          onClick={stopEmbed}
        >
          Participant phone
        </button>
      </div>

      <div className="lab-phone" aria-label="Customer device preview">
        <div className="lab-phone__bezel">
          <div className="lab-phone__island" />
          <div className="lab-phone__screen lab-phone__screen--app">
            {embedActive && iframeSrc ? (
              <iframe
                className="lab-phone__iframe"
                src={iframeSrc}
                title="Customer journey"
              />
            ) : remoteActive ? (
              <CustomerLivePanel session={session} config={config} />
            ) : (
              <div className="lab-phone__placeholder">
                <p className="lab-phone__placeholder-title">Customer journey</p>
                <p className="lab-phone__placeholder-steps">
                  <strong>Teams / Meet:</strong> tap On-screen demo
                </p>
                <p className="lab-phone__placeholder-hint">
                  <strong>In person:</strong> scan the QR on a phone
                </p>
                <button type="button" className="lab-phone__start-btn" onClick={startEmbed}>
                  Start on-screen demo
                </button>
              </div>
            )}
          </div>
          <div className="lab-phone__home-bar" />
        </div>
      </div>

      <div className="lab-device-column__footer">
        <div className="lab-device-stage">
          <span className="lab-device-stage__label">Current step</span>
          <span className="lab-device-stage__value">{stage}</span>
        </div>
        {config?.retailer && (
          <p className="lab-device-column__meta">
            {config.retailer} · Share this browser window in Teams or Meet
          </p>
        )}
      </div>
    </div>
  );
}
