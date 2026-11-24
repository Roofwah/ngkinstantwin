import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDeviceConfig, submitDirectClaim, setDemoCampaign, postLabEvent } from '../api';
import NiterraCrosswordEntryForm from '../components/NiterraCrosswordEntryForm';
import { NITERRA_CAMPAIGN_ID } from '../campaigns/niterraRepco';
import '../campaigns/niterra-repco.css';

const DEFAULT_DEVICE = 'PR-DEMO-001';

/** Niterra / Repco instant win — same Lab phone journey as Ford Display Lab. */
export default function NiterraCrosswordEnter() {
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
        await setDemoCampaign(NITERRA_CAMPAIGN_ID);
        const data = await getDeviceConfig(deviceCode);
        if (cancelled) return;
        if (data?.campaign?.id !== NITERRA_CAMPAIGN_ID) {
          throw new Error('Niterra campaign is not active on this device');
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
      campaignId: NITERRA_CAMPAIGN_ID,
      labSessionId: labSession,
      ...payload,
    });
  }

  if (loading) {
    return (
      <div className="ngk-page ngk-page--enter" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="ngk-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (error || !config?.campaign) {
    return (
      <div className="ngk-page ngk-page--enter" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="ngk-form-panel" style={{ maxWidth: 420, width: '100%' }}>
          <h2 className="ngk-title">Unavailable</h2>
          <p className="ngk-lede">{error || 'Niterra Instant Win is not active on this device.'}</p>
        </div>
      </div>
    );
  }

  const brands = config.campaign.config?.eligibleBrands?.length
    ? config.campaign.config.eligibleBrands
    : ['NGK', 'NTK', 'KYB'];

  return (
    <NiterraCrosswordEntryForm
      campaign={config.campaign}
      device={config.device}
      brands={brands}
      labSessionId={labSession}
      onComplete={handleComplete}
    />
  );
}
