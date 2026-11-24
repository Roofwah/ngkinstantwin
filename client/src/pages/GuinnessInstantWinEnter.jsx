import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDeviceConfig, submitDirectClaim, setDemoCampaign, postLabEvent } from '../api';
import GuinnessEntryForm from '../components/GuinnessEntryForm';
import { GUINNESS_CAMPAIGN_ID } from '../campaigns/guinness';
import '../campaigns/guinness.css';

const DEFAULT_DEVICE = 'PR-PUK2-001';

/** Guinness — branded instant win entry (scan QR on PUK). */
export default function GuinnessInstantWinEnter() {
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
        await setDemoCampaign(GUINNESS_CAMPAIGN_ID);
        const data = await getDeviceConfig(deviceCode);
        if (cancelled) return;
        if (data?.campaign?.id !== GUINNESS_CAMPAIGN_ID) {
          throw new Error('Guinness campaign is not active on this device');
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
      campaignId: GUINNESS_CAMPAIGN_ID,
      labSessionId: labSession,
      ...payload,
    });
  }

  if (loading) {
    return (
      <div className="guinness-page guinness-page--loading">
        <span className="guinness-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (error || !config?.campaign) {
    return (
      <div className="guinness-page guinness-page--loading">
        <div className="guinness-unavailable">
          <h2>Unavailable</h2>
          <p>{error || 'Guinness Instant Win is not active on this device.'}</p>
        </div>
      </div>
    );
  }

  return (
    <GuinnessEntryForm
      campaign={config.campaign}
      onComplete={handleComplete}
    />
  );
}
