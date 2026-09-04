import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDeviceConfig, submitDirectClaim, setDemoCampaign, postLabEvent } from '../api';
import NiterraCrosswordEntryForm from '../components/NiterraCrosswordEntryForm';
import { NITERRA_CAMPAIGN_ID } from '../campaigns/niterraRepco';

const DEFAULT_DEVICE = 'PR-PUK2-001';

/** HOKA-style crossword entry for Niterra / Repco — separate from /enter receipt flow. */
export default function NiterraCrosswordEnter() {
  const [searchParams] = useSearchParams();
  const deviceCode = searchParams.get('device') || DEFAULT_DEVICE;
  const labSession = searchParams.get('labSession');
  const entryNotified = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);

  useEffect(() => {
    setDemoCampaign(NITERRA_CAMPAIGN_ID).catch(() => {});
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
      campaignId: NITERRA_CAMPAIGN_ID,
      labSessionId: labSession,
      ...payload,
    });
  }

  if (loading) {
    return (
      <div className="page" style={{ alignItems: 'center', justifyContent: 'center', background: '#0b1a33' }}>
        <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  if (error || !config?.campaign) {
    return (
      <div className="page" style={{ background: '#0b1a33', color: '#f7f4ee' }}>
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="container">
            <div className="card" style={{ textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: 8 }}>Unavailable</h2>
              <p style={{ color: 'var(--text-2)' }}>{error || 'No active campaign.'}</p>
            </div>
          </div>
        </main>
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
      onComplete={handleComplete}
    />
  );
}
