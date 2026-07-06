import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { validateToken, submitTokenClaim } from '../api';
import { getInstantWinTheme } from '../config/instantWinThemes';
import InstantWinForm from '../components/InstantWinForm';

const STEPS = { LOADING: 0, INVALID: 1 };

export default function TokenLanding() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(STEPS.LOADING);
  const [tokenData, setTokenData] = useState(null);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    validateToken(token)
      .then(data => {
        setTokenData(data);
        startCountdown(new Date(data.expiresAt).getTime());
      })
      .catch(err => {
        setError(err.message);
        setStep(STEPS.INVALID);
      });
    return () => clearInterval(timerRef.current);
  }, [token]);

  function startCountdown(expiresAt) {
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, expiresAt - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(timerRef.current);
    }, 1000);
  }

  function formatTime(ms) {
    if (ms === null) return '--:--';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  async function handleComplete(receiptPayload) {
    const { claimId } = await submitTokenClaim({
      tokenId: tokenData.tokenId,
      mobile: receiptPayload.mobile,
      invoiceNumber: receiptPayload.invoiceNumber,
      purchaseDate: receiptPayload.purchaseDate,
      storeCode: receiptPayload.storeCode,
      productDescription: receiptPayload.productDescription,
      selectedBrand: receiptPayload.selectedBrand,
      spendAmount: receiptPayload.spendAmount,
      receiptSource: receiptPayload.receiptSource,
      verificationMethod: receiptPayload.verificationMethod,
      receiptFile: receiptPayload.receiptFile,
    });
    navigate(`/scratch/${claimId}`);
  }

  if (step === STEPS.LOADING && !tokenData) {
    return (
      <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  if (step === STEPS.INVALID || !tokenData) {
    return (
      <div className="page">
        <header className="topbar" style={{ justifyContent: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: '0.08em' }}>POWERED BY PURERANDOM™</span>
        </header>
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="container">
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--red)', marginBottom: 12 }}>!</div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', marginBottom: 8 }}>Token Invalid</h2>
              <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>{error || 'This token is not valid.'}</p>
              <p style={{ color: 'var(--text-3)', fontSize: '0.95rem', marginTop: 12 }}>Ask the store staff to generate a new token.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const brands = tokenData?.campaign?.config?.eligibleBrands?.length
    ? tokenData.campaign.config.eligibleBrands
    : ['NGK', 'NTK', 'KYB'];

  const theme = getInstantWinTheme('v1', tokenData.campaign);

  return (
    <InstantWinForm
      theme={theme}
      campaign={tokenData.campaign}
      device={tokenData.device}
      brands={brands}
      showTokenBar
      token={token}
      timeLeft={timeLeft}
      formatTime={formatTime}
      onComplete={handleComplete}
    />
  );
}
