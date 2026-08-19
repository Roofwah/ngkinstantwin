import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { pollLabSession } from '../api';
import { resolveLabCampaign } from '../config/labCampaigns';
import '../lab/lab-audience.css';

const POLL_MS = 2000;

/**
 * Audience / Meet screen — full-size real customer journey.
 * Share THIS window in Teams or Google Meet. Keep /lab private for Turnstyle notes.
 */
export default function LabDisplay() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) return undefined;

    let cancelled = false;

    async function load() {
      try {
        const data = await pollLabSession(sessionId);
        if (!cancelled) setSession(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Session not found');
      }
    }

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionId]);

  if (error) {
    return (
      <div className="lab-display lab-display--error">
        <p>{error}</p>
        <p className="lab-display__error-hint">
          Sessions are tied to the Lab. Open <a href="/lab">/lab</a>, then click
          {' '}<strong>Open audience screen</strong> again.
        </p>
        <a className="lab-display__presenter-link" href="/lab">Go to Lab →</a>
      </div>
    );
  }

  if (!session?.entryUrl) {
    return (
      <div className="lab-display lab-display--loading">
        <p>Loading customer experience…</p>
      </div>
    );
  }

  const config = resolveLabCampaign({
    configId: session.labConfigId,
    campaignId: session.campaignId,
  });
  const accent = config?.branding?.accentColor || '#e86600';

  return (
    <div className="lab-display" style={{ '--lab-accent': accent }}>
      <header className="lab-display__header">
        <div className="lab-display__brand">
          <span className="lab-display__campaign">{session.campaignName}</span>
          <span className="lab-display__retailer">{session.retailer || config?.retailer}</span>
        </div>
        <div className="lab-display__stage">
          <span className="lab-display__stage-label">Turnstyle</span>
          <span className="lab-display__stage-value">{session.stageLabel}</span>
        </div>
      </header>

      <main className="lab-display__main">
        <div className="lab-display__device">
          <div className="lab-display__device-notch" />
          <iframe
            className="lab-display__iframe"
            src={session.entryUrl}
            title={`${session.campaignName} — customer journey`}
          />
          <div className="lab-display__device-bar" />
        </div>
      </main>

      <footer className="lab-display__footer">
        <span>Powered by Turnstyle · Pure Random Instant Win</span>
        <a className="lab-display__presenter-link" href={config ? `/lab/${config.configId}` : '/lab'} target="_blank" rel="noreferrer">
          Open presenter Lab →
        </a>
      </footer>
    </div>
  );
}
