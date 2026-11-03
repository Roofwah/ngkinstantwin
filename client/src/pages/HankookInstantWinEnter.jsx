import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDeviceConfig, submitDirectClaim, setDemoCampaign, postLabEvent } from '../api';
import HankookEntryForm from '../components/HankookEntryForm';
import { HANKOOK_CAMPAIGN_ID } from '../campaigns/hankook';
import '../campaigns/hankook.css';

const DEFAULT_DEVICE = 'PR-PUK2-004';

/** Hankook — branded instant win entry (scan QR on PUK). */
export default function HankookInstantWinEnter() {
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

    async function loadHankookConfig() {
      try {
        await setDemoCampaign(HANKOOK_CAMPAIGN_ID);
        const data = await getDeviceConfig(deviceCode);
        if (cancelled) return;
        if (data?.campaign?.id !== HANKOOK_CAMPAIGN_ID) {
          throw new Error('Hankook campaign is not active on this device');
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

    loadHankookConfig();
    return () => { cancelled = true; };
  }, [deviceCode]);

  async function handleComplete(payload) {
    return submitDirectClaim({
      deviceCode,
      campaignId: HANKOOK_CAMPAIGN_ID,
      labSessionId: labSession,
      ...payload,
    });
  }

  if (loading) {
    return (
      <div className="hankook-page hankook-page--loading">
        <span className="hankook-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (error || !config?.campaign) {
    return (
      <div className="hankook-page hankook-page--loading">
        <div className="hankook-unavailable">
          <h2>Unavailable</h2>
          <p>{error || 'Hankook Instant Win is not active on this device.'}</p>
        </div>
      </div>
    );
  }

  return (
    <HankookEntryForm
      campaign={config.campaign}
      onComplete={handleComplete}
    />
  );
}
