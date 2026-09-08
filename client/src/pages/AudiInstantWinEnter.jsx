import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDeviceConfig, submitDirectClaim, setDemoCampaign, postLabEvent } from '../api';
import AudiEntryForm from '../components/AudiEntryForm';
import { AUDI_CAMPAIGN_ID } from '../campaigns/audi';

const DEFAULT_DEVICE = 'PR-PUK2-001';

/** Audi Instant Win — direct entry (no receipt upload, separate from HOKA / Niterra flows). */
export default function AudiInstantWinEnter() {
  const [searchParams] = useSearchParams();
  const deviceCode = searchParams.get('device') || DEFAULT_DEVICE;
  const labSession = searchParams.get('labSession');
  const entryNotified = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);

  useEffect(() => {
    setDemoCampaign(AUDI_CAMPAIGN_ID).catch(() => {});
  }, []);

  useEffect(() => {
    if (!labSession || entryNotified.current) return;
    entryNotified.current = true;
    postLabEvent(labSession, 'entry_opened').catch(() => {});
  }, [labSession]);

  useEffect(() => {
    getDeviceConfig(deviceCode)
      .then((data) => {
        setConfig(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Could not load campaign');
        setLoading(false);
      });
  }, [deviceCode]);

  async function handleComplete(payload) {
    return submitDirectClaim({
      deviceCode,
      campaignId: AUDI_CAMPAIGN_ID,
      labSessionId: labSession,
      ...payload,
    });
  }

  if (loading) {
    return (
      <div className="audi-page audi-page--loading">
        <span className="audi-spinner" aria-label="Loading" />
      </div>
    );
  }

  if (error || !config?.campaign) {
    return (
      <div className="audi-page audi-page--loading">
        <div className="audi-unavailable">
          <h2>Unavailable</h2>
          <p>{error || 'Audi Instant Win is not active on this device.'}</p>
        </div>
      </div>
    );
  }

  const models = config.campaign.config?.eligibleBrands?.length
    ? config.campaign.config.eligibleBrands
    : undefined;

  return (
    <AudiEntryForm
      campaign={config.campaign}
      models={models}
      onComplete={handleComplete}
    />
  );
}
