import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDeviceConfig, submitDirectClaim, setDemoCampaign, postLabEvent } from '../api';
import FordEntryForm from '../components/FordEntryForm';
import { FORD_CAMPAIGN_ID } from '../campaigns/ford';
import '../campaigns/ford.css';

const DEFAULT_DEVICE = 'PR-PUK2-001';

/** Ford Display Lab — branded instant win entry (scan QR on PUK). */
export default function FordInstantWinEnter() {
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

    async function loadFordConfig() {
      try {
        await setDemoCampaign(FORD_CAMPAIGN_ID);
        const data = await getDeviceConfig(deviceCode);
        if (cancelled) return;
        if (data?.campaign?.id !== FORD_CAMPAIGN_ID) {
          throw new Error('Ford campaign is not active on this device');
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

    loadFordConfig();
    return () => { cancelled = true; };
  }, [deviceCode]);

  async function handleComplete(payload) {
    return submitDirectClaim({
      deviceCode,
      campaignId: FORD_CAMPAIGN_ID,
      labSessionId: labSession,
      ...payload,
    });
  }

  if (loading) {
    return (
      <div className="ford-page ford-page--loading">
        <span className="ford-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (error || !config?.campaign) {
    return (
      <div className="ford-page ford-page--loading">
        <div className="ford-unavailable">
          <h2>Unavailable</h2>
          <p>{error || 'Ford Display Lab is not active on this device.'}</p>
        </div>
      </div>
    );
  }

  const vehicles = config.campaign.config?.eligibleBrands?.length
    ? config.campaign.config.eligibleBrands
    : undefined;

  return (
    <FordEntryForm
      campaign={config.campaign}
      vehicles={vehicles}
      onComplete={handleComplete}
    />
  );
}
