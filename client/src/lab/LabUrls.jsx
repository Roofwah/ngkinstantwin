/** Shows the exact URLs for Lab + phone QR — copy or scan these. */
export default function LabUrls({ session, config, onNewSession }) {
  if (!session?.sessionId) return null;

  const labUrl = config?.configId
    ? `${window.location.origin}/lab/${config.configId}`
    : `${window.location.origin}/lab`;
  const entryUrl = session.entryUrl;

  return (
    <div className="lab-urls">
      <div className="lab-urls__row">
        <span className="lab-urls__label">Lab (this Mac)</span>
        <code className="lab-urls__value">{labUrl}</code>
      </div>
      <div className="lab-urls__row">
        <span className="lab-urls__label">Phone / QR URL</span>
        <code className="lab-urls__value">{entryUrl}</code>
      </div>
      <div className="lab-urls__row">
        <span className="lab-urls__label">Session ID</span>
        <code className="lab-urls__value">{session.sessionId}</code>
      </div>
      {onNewSession && (
        <button type="button" className="lab-urls__reset" onClick={onNewSession}>
          New session
        </button>
      )}
    </div>
  );
}
