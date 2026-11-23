import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDeviceConfig, submitDirectClaim, setDemoCampaign, postLabEvent } from '../api';
import TacoBellEntryForm from '../components/TacoBellEntryForm';
import { TACO_BELL_CAMPAIGN_ID } from '../campaigns/tacoBell';
import '../campaigns/tacoBell.css';

const DEFAULT_DEVICE = 'PR-DEMO-001';

/** Taco Bell US — branded instant win entry (US mobile OTP). */
export default function TacoBellInstantWinEnter() {
  const [searchParams] = useSearchParams();
  const deviceCode = searchParams.get('device') || DEFAULT_DEVICE;
  const labSession = searchParams.get('labSession');
  const entryNotified = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!labSession || entryNotified.current) return;
    entryNotified.current = true;
    postLabEvent(labSession, 'entry_opened').catch(() => {});
  }, [labSession]);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        await setDemoCampaign(TACO_BELL_CAMPAIGN_ID);
        const data = await getDeviceConfig(deviceCode);
        if (cancelled) return;
        if (data?.campaign?.id !== TACO_BELL_CAMPAIGN_ID) {
          throw new Error('Taco Bell campaign is not active on this device');
        }
        setConfig(data);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Could not load campaign');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadConfig();
    return () => { cancelled = true; };
  }, [deviceCode]);

  async function handleComplete(payload) {
    return submitDirectClaim({
      deviceCode,
      campaignId: TACO_BELL_CAMPAIGN_ID,
      labSessionId: labSession,
      ...payload,
    });
  }

  if (loading) {
    return (
      <div className="taco-bell-page taco-bell-page--loading">
        <span className="taco-bell-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (error || !config?.campaign) {
    return (
      <div className="taco-bell-page taco-bell-page--loading">
        <div className="taco-bell-unavailable">
          <h2>Unavailable</h2>
          <p>{error || 'Taco Bell Instant Win is not active on this device.'}</p>
        </div>
      </div>
    );
  }

  return (
    <TacoBellEntryForm
      campaign={config.campaign}
      onComplete={handleComplete}
    />
  );
}
