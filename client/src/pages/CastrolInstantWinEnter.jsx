import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDeviceConfig, submitDirectClaim, setDemoCampaign, postLabEvent } from '../api';
import CastrolEntryForm from '../components/CastrolEntryForm';
import { CASTROL_CAMPAIGN_ID } from '../campaigns/castrol';
import '../campaigns/castrol.css';

const DEFAULT_DEVICE = 'PR-PUK2-004';

/** Castrol — branded instant win entry (scan QR on PUK). */
export default function CastrolInstantWinEnter() {
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

    async function loadCastrolConfig() {
      try {
        await setDemoCampaign(CASTROL_CAMPAIGN_ID);
        const data = await getDeviceConfig(deviceCode);
        if (cancelled) return;
        if (data?.campaign?.id !== CASTROL_CAMPAIGN_ID) {
          throw new Error('Castrol campaign is not active on this device');
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

    loadCastrolConfig();
    return () => { cancelled = true; };
  }, [deviceCode]);

  async function handleComplete(payload) {
    return submitDirectClaim({
      deviceCode,
      campaignId: CASTROL_CAMPAIGN_ID,
      labSessionId: labSession,
      ...payload,
    });
  }

  if (loading) {
    return (
      <div className="castrol-page castrol-page--loading">
        <span className="castrol-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (error || !config?.campaign) {
    return (
      <div className="castrol-page castrol-page--loading">
        <div className="castrol-unavailable">
          <h2>Unavailable</h2>
          <p>{error || 'Castrol Instant Win is not active on this device.'}</p>
        </div>
      </div>
    );
  }

  return (
    <CastrolEntryForm
      campaign={config.campaign}
      onComplete={handleComplete}
    />
  );
}
