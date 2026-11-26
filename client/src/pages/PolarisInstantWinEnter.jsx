import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDeviceConfig, submitDirectClaim, setDemoCampaign, postLabEvent } from '../api';
import PolarisEntryForm from '../components/PolarisEntryForm';
import { POLARIS_CAMPAIGN_ID } from '../campaigns/polaris';
import '../campaigns/polaris.css';

const DEFAULT_DEVICE = 'PR-PUK2-001';

/** Polaris Instant Win — branded entry (scan QR on PUK). */
export default function PolarisInstantWinEnter() {
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

    async function loadPolarisConfig() {
      try {
        await setDemoCampaign(POLARIS_CAMPAIGN_ID);
        const data = await getDeviceConfig(deviceCode);
        if (cancelled) return;
        if (data?.campaign?.id !== POLARIS_CAMPAIGN_ID) {
          throw new Error('Polaris campaign is not active on this device');
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

    loadPolarisConfig();
    return () => { cancelled = true; };
  }, [deviceCode]);

  async function handleComplete(payload) {
    return submitDirectClaim({
      deviceCode,
      campaignId: POLARIS_CAMPAIGN_ID,
      labSessionId: labSession,
      ...payload,
    });
  }

  if (loading) {
    return (
      <div className="polaris-page polaris-page--loading">
        <span className="polaris-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (error || !config?.campaign) {
    return (
      <div className="polaris-page polaris-page--loading">
        <div className="polaris-unavailable">
          <h2>Unavailable</h2>
          <p>{error || 'Polaris Instant Win is not active on this device.'}</p>
        </div>
      </div>
    );
  }

  const models = config.campaign.config?.eligibleBrands?.length
    ? config.campaign.config.eligibleBrands
    : undefined;

  return (
    <PolarisEntryForm
      campaign={config.campaign}
      models={models}
      onComplete={handleComplete}
    />
  );
}
