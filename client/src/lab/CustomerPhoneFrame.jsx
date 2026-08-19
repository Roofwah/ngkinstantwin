/**
 * Phone frame with the real customer journey embedded — always visible on the right.
 */
export default function CustomerPhoneFrame({ entryUrl, session }) {
  const stage = session?.stageLabel || 'Ready';

  return (
    <div className="lab-device-column">
      <div className="lab-device-column__header">
        <span className="lab-device-column__eyebrow">Customer experience</span>
        <span className="lab-device-column__title">Live on device</span>
      </div>

      <div className="lab-phone" aria-label="Customer phone">
        <div className="lab-phone__bezel">
          <div className="lab-phone__island" />
          <div className="lab-phone__screen lab-phone__screen--app">
            {entryUrl ? (
              <iframe
                className="lab-phone__iframe"
                src={entryUrl}
                title="Customer journey"
              />
            ) : (
              <div className="lab-phone__placeholder">
                <p>Starting session…</p>
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
        <p className="lab-device-column__meta">
          Share this browser window in Teams or Meet — Lab left, customer UI right.
        </p>
      </div>
    </div>
  );
}
