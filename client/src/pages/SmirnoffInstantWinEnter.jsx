import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDeviceConfig, postLabEvent, setDemoCampaign, submitDirectClaim } from '../api';
import SmirnoffEntryForm from '../components/SmirnoffEntryForm';
import { SMIRNOFF_CAMPAIGN_ID } from '../campaigns/smirnoff';
import '../campaigns/smirnoff.css';

const DEFAULT_DEVICE = 'PR-DEMO-001';

export default function SmirnoffInstantWinEnter() {
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
        await setDemoCampaign(SMIRNOFF_CAMPAIGN_ID);
        const data = await getDeviceConfig(deviceCode);
        if (cancelled) return;
        if (data?.campaign?.id !== SMIRNOFF_CAMPAIGN_ID) {
          throw new Error('Smirnoff campaign is not active on this device');
        }
        setConfig(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load campaign');
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
      campaignId: SMIRNOFF_CAMPAIGN_ID,
      labSessionId: labSession,
      ...payload,
    });
  }

  if (loading) {
    return (
      <div className="smirnoff-page">
        <div className="smirnoff-wrap"><p className="smirnoff-lede">Loading…</p></div>
      </div>
    );
  }

  if (error || !config?.campaign) {
    return (
      <div className="smirnoff-page">
        <div className="smirnoff-wrap">
          <h1 className="smirnoff-title">Unavailable</h1>
          <p className="smirnoff-lede">{error || 'Smirnoff Instant Win is not active on this device.'}</p>
        </div>
      </div>
    );
  }

  return <SmirnoffEntryForm campaign={config.campaign} onComplete={handleComplete} />;
}
