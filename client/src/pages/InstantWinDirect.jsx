import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDeviceConfig, submitDirectClaim, setDemoCampaign, postLabEvent } from '../api';
import { getInstantWinTheme } from '../config/instantWinThemes';
import InstantWinForm from '../components/InstantWinForm';
import { isHokaCampaign } from '../campaigns/hokaCotswold';

const DEFAULT_DEVICE = 'PR-DEMO-001';

/** Token-free instant win — same form as /t/:token but opens directly. */
export default function InstantWinDirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deviceCode = searchParams.get('device') || DEFAULT_DEVICE;
  const labSession = searchParams.get('labSession');
  const campaignParam = searchParams.get('campaign');
  const entryNotified = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (campaignParam && deviceCode !== 'PR-PUK2-001') {
      setDemoCampaign(campaignParam).catch(() => {});
    }
  }, [campaignParam, deviceCode]);

  useEffect(() => {
    if (!labSession || entryNotified.current) return;
    entryNotified.current = true;
    postLabEvent(labSession, 'entry_opened').catch(() => {});
  }, [labSession]);

  useEffect(() => {
    getDeviceConfig(deviceCode)
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Could not load campaign');
        setLoading(false);
      });
  }, [deviceCode]);

  async function handleComplete(receiptPayload) {
    const qs = labSession ? `?labSession=${encodeURIComponent(labSession)}` : '';
    const outcome = await submitDirectClaim({
      deviceCode,
      campaignId: campaignParam || config?.campaign?.id,
      labSessionId: labSession,
      customerName: receiptPayload.customerName,
      mobile: receiptPayload.mobile,
      invoiceNumber: receiptPayload.invoiceNumber,
      purchaseDate: receiptPayload.purchaseDate,
      purchaseTime: receiptPayload.purchaseTime,
      storeCode: receiptPayload.storeCode,
      storeName: receiptPayload.storeName,
      productDescription: receiptPayload.productDescription,
      selectedBrand: receiptPayload.selectedBrand,
      spendAmount: receiptPayload.spendAmount,
      receiptSource: receiptPayload.receiptSource,
      verificationMethod: receiptPayload.verificationMethod,
      receiptFile: receiptPayload.receiptFile,
      postcode: receiptPayload.postcode,
    });
    if (isHokaCampaign(config?.campaign)) return outcome;
    navigate(`/scratch/${outcome.claimId}${qs}`);
  }

  if (loading) {
    return (
      <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  if (error || !config?.campaign) {
    return (
      <div className="page">
        <header className="topbar" style={{ justifyContent: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: '0.08em' }}>POWERED BY PURERANDOM™</span>
        </header>
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

  const theme = getInstantWinTheme('v1', config.campaign);
  const campaignArt = config.campaign.config?.landingHeroUrl || '/instant-win/bg.png';

  return (
    <InstantWinForm
      theme={theme}
      campaign={config.campaign}
      device={config.device}
      brands={brands}
      showTokenBar={false}
      campaignLayout
      campaignArtSrc={campaignArt}
      labSessionId={labSession}
      onComplete={handleComplete}
    />
  );
}
