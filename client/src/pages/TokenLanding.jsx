import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { validateToken, sendOtp, verifyOtp, submitTokenClaim } from '../api';

const STEPS = { LOADING: 0, INVALID: 1, PURCHASE: 2, MOBILE: 3, OTP: 4, SUBMITTING: 5 };
const BRANDS = ['NGK', 'NTK', 'KYB'];

export default function TokenLanding() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(STEPS.LOADING);
  const [tokenData, setTokenData] = useState(null);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const timerRef = useRef(null);

  // Purchase fields
  const [customerName, setCustomerName] = useState('');
  const [spendAmount, setSpendAmount] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');

  // Mobile / OTP
  const [mobile, setMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpDemo, setOtpDemo] = useState(false);

  useEffect(() => {
    validateToken(token)
      .then(data => {
        setTokenData(data);
        setStep(STEPS.PURCHASE);
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

  function normaliseMobile(raw) {
    const s = raw.replace(/[\s\-()]/g, '');
    if (/^\+614/.test(s)) return '0' + s.slice(3);
    return s;
  }

  function handlePurchaseNext() {
    setError('');
    if (!customerName.trim()) { setError('Please enter your name'); return; }
    if (!spendAmount || parseFloat(spendAmount) <= 0) { setError('Please enter a valid purchase amount'); return; }
    if (!selectedBrand) { setError('Please select a brand'); return; }
    setStep(STEPS.MOBILE);
  }

  async function handleSendOtp() {
    setError('');
    const norm = normaliseMobile(mobile);
    if (!/^04\d{8}$/.test(norm)) {
      setError('Enter a valid Australian mobile (04XX XXX XXX or +61 4XX XXX XXX)');
      return;
    }
    setOtpSending(true);
    try {
      const res = await sendOtp(norm);
      setOtpDemo(!!res.demo);
      setStep(STEPS.OTP);
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOtp() {
    setError('');
    if (otpCode.length !== 6) { setError('Enter the 6-digit code'); return; }
    const norm = normaliseMobile(mobile);
    setOtpVerifying(true);
    try {
      await verifyOtp(norm, otpCode);
      setStep(STEPS.SUBMITTING);
      const { claimId } = await submitTokenClaim(
        tokenData.tokenId, norm, customerName.trim(), parseFloat(spendAmount), selectedBrand
      );
      navigate(`/scratch/${claimId}`);
    } catch (err) {
      setError(err.message);
      setOtpVerifying(false);
      setStep(STEPS.OTP);
    }
  }

  // ── Loading ──
  if (step === STEPS.LOADING) {
    return (
      <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      </div>
    );
  }

  // ── Invalid token ──
  if (step === STEPS.INVALID) {
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
              <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: 12 }}>Ask the store staff to generate a new token.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Submitting ──
  if (step === STEPS.SUBMITTING) {
    return (
      <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <p style={{ marginTop: 16, color: 'var(--text-2)' }}>Preparing your scratch card...</p>
        </div>
      </div>
    );
  }

  const currentStep = step - 1; // PURCHASE=2→1, MOBILE=3→2, OTP=4→3
  const stepLabels = ['Purchase', 'Mobile', 'Verify'];

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>

      {/* Topbar */}
      <header className="topbar" style={{ justifyContent: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: '0.08em' }}>POWERED BY PURERANDOM™</span>
      </header>

      {/* Promo header */}
      <div style={{
        background: 'var(--bg-2)',
        borderBottom: '1px solid var(--border)',
        padding: '24px 16px',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <img src="/logos/rrlogo.png" alt="Repco Rewards" style={{ maxWidth: 200, width: '100%' }} />
        </div>
        <div className="hero__brands" style={{ marginBottom: 12 }}>
          <img src="/logos/logos.png" alt="NGK · NTK · KYB" style={{ maxWidth: 200, width: '100%' }} />
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', marginBottom: 0 }}>
          {tokenData?.campaign?.tagline || 'Buy eligible NGK, NTK or KYB products and instantly win'}
        </p>

      </div>

      <main style={{ flex: 1, padding: '28px 16px' }}>
        <div className="container">

          {/* Step indicator */}
          <div className="steps">
            {stepLabels.map((label, i) => {
              const n = i + 1;
              const done = currentStep > n;
              const active = currentStep === n;
              return (
                <div key={n} className={`step${active ? ' step--active' : ''}${done ? ' step--done' : ''}`}>
                  <div className="step__dot">{done ? '✓' : n}</div>
                  <span className="step__label">{label}</span>
                </div>
              );
            })}
          </div>

          {error && <div className="alert alert--error">{error}</div>}

          {/* ── Step: Purchase details ── */}
          {step === STEPS.PURCHASE && (
            <div className="card">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Your Purchase
              </h2>

              <div className="field">
                <label>Full Name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={customerName}
                  onChange={e => { setCustomerName(e.target.value); setError(''); }}
                  autoFocus
                />
              </div>

              <div className="field">
                <label>Purchase Amount ($) *</label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={spendAmount}
                  onChange={e => { setSpendAmount(e.target.value); setError(''); }}
                />
              </div>

              <div className="field">
                <label>Brand Purchased *</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {BRANDS.map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => { setSelectedBrand(b); setError(''); }}
                      className={selectedBrand === b ? 'btn btn--primary' : 'btn btn--ghost'}
                      style={{ flex: 1 }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn--primary btn--full" onClick={handlePurchaseNext}>
                Continue →
              </button>
            </div>
          )}

          {/* ── Step: Mobile ── */}
          {step === STEPS.MOBILE && (
            <div className="card">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Your Mobile Number
              </h2>

              <div className="field">
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  placeholder="0412 345 678"
                  value={mobile}
                  onChange={e => { setMobile(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                  autoComplete="tel"
                  autoFocus
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                  We'll send a one-time code to verify it's you
                </span>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn--ghost" onClick={() => { setStep(STEPS.PURCHASE); setError(''); }}>
                  Back
                </button>
                <button
                  className="btn btn--primary"
                  style={{ flex: 1 }}
                  onClick={handleSendOtp}
                  disabled={otpSending}
                >
                  {otpSending
                    ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Sending...</>
                    : 'Send Code →'}
                </button>
              </div>
            </div>
          )}

          {/* ── Step: OTP ── */}
          {step === STEPS.OTP && (
            <div className="card">
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Verify Your Number
              </h2>
              <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: 16 }}>
                Code sent to {mobile}
              </p>

              {otpDemo && (
                <div style={{ fontSize: '0.72rem', color: 'var(--amber)', marginBottom: 14, padding: '6px 10px', background: 'rgba(255,171,0,0.08)', borderRadius: 4 }}>
                  Demo mode — enter <strong>123456</strong> to verify
                </div>
              )}

              <div className="field">
                <label>6-Digit Code *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                    placeholder="123456"
                    autoFocus
                    style={{ letterSpacing: '0.2em', fontSize: '1.1rem', textAlign: 'center' }}
                  />
                  <button
                    type="button"
                    className="btn btn--primary"
                    style={{ whiteSpace: 'nowrap', padding: '0 18px' }}
                    onClick={handleVerifyOtp}
                    disabled={otpVerifying || otpCode.length !== 6}
                  >
                    {otpVerifying ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Verify'}
                  </button>
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>Code expires in 10 min</span>
              </div>

              <button
                className="btn btn--ghost btn--full"
                style={{ fontSize: '0.85rem', padding: '10px' }}
                onClick={() => { setStep(STEPS.MOBILE); setOtpCode(''); setError(''); }}
              >
                Change number
              </button>
            </div>
          )}

          {/* Token + countdown — below the form */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 20,
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '8px 14px',
            fontSize: '0.78rem',
          }}>
            <span style={{ color: 'var(--text-3)' }}>
              Token: <span style={{ color: 'var(--text)', fontFamily: 'monospace', letterSpacing: '0.06em' }}>{token}</span>
            </span>
            <span style={{
              color: timeLeft !== null && timeLeft < 60000 ? 'var(--red)' : 'var(--amber)',
              fontFamily: 'monospace',
              fontWeight: 600,
            }}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <p className="compliance-note" style={{ marginTop: 12 }}>
            Instant win outcomes are determined by a secure server-side prize manifest prior to reveal.
            {tokenData?.device?.storeName && ` · ${tokenData.device.storeName}`}
          </p>

        </div>
      </main>
    </div>
  );
}
