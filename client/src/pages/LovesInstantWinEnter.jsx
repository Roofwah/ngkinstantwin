import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDeviceConfig, submitDirectClaim, setDemoCampaign, postLabEvent } from '../api';
import LovesEntryForm from '../components/LovesEntryForm';
import { LOVES_CAMPAIGN_ID } from '../campaigns/loves';
import '../campaigns/loves.css';

const DEFAULT_DEVICE = 'PR-PUK2-001';

/** Loves — branded instant win entry (scan QR on PUK). */
export default function LovesInstantWinEnter() {
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
        await setDemoCampaign(LOVES_CAMPAIGN_ID);
        const data = await getDeviceConfig(deviceCode);
        if (cancelled) return;
        if (data?.campaign?.id !== LOVES_CAMPAIGN_ID) {
          throw new Error('Loves campaign is not active on this device');
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
      campaignId: LOVES_CAMPAIGN_ID,
      labSessionId: labSession,
      ...payload,
    });
  }

  if (loading) {
    return (
      <div className="loves-page loves-page--loading">
        <span className="loves-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (error || !config?.campaign) {
    return (
      <div className="loves-page loves-page--loading">
        <div className="loves-unavailable">
          <h2>Unavailable</h2>
          <p>{error || 'Loves Instant Win is not active on this device.'}</p>
        </div>
      </div>
    );
  }

  return (
    <LovesEntryForm
      campaign={config.campaign}
      onComplete={handleComplete}
    />
  );
}
