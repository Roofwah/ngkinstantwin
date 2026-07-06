import { useState } from 'react';
import { sendOtp, verifyOtp } from '../api';
import { CampaignShell, CampaignLegalFooter } from './CampaignArtFrame';
import ReceiptCaptureStep from './ReceiptCaptureStep';

export const FORM_STEPS = { MOBILE: 1, OTP: 2, RECEIPT: 3, SUBMITTING: 4 };

function normaliseMobile(raw) {
  const s = raw.replace(/[\s\-()]/g, '');
  if (/^\+614/.test(s)) return '0' + s.slice(3);
  return s;
}

function brandLogoPath(brand) {
  const key = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['ngk', 'ntk', 'kyb'].includes(key)) return `/logos/${key}.svg`;
  return null;
}

function BrandLogoRow({ brands, campaign }) {
  if (brands?.length) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        {brands.map(b => {
          const src = brandLogoPath(b);
          if (src) {
            return <img key={b} src={src} alt={b} style={{ height: 48, width: 'auto' }} />;
          }
          return (
            <span key={b} style={{
              fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-2)',
              padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8,
            }}>
              {b}
            </span>
          );
        })}
      </div>
    );
  }
  if (campaign?.brand) {
    return (
      <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 12 }}>
        {campaign.brand}
      </p>
    );
  }
  return null;
}

function PromoHeader({ theme, campaign, brands }) {
  if (theme.heroStyle === 'banner' && theme.heroOnly && theme.heroImage) {
    return (
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <img
          src={theme.heroImage}
          alt={campaign?.name ? `${campaign.name} instant win promotion` : 'Instant win promotion'}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </div>
    );
  }

  if (theme.heroStyle === 'banner') {
    return (
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        {theme.heroImage && (
          <img
            src={theme.heroImage}
            alt=""
            style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}
        <div style={{
          background: `linear-gradient(135deg, ${theme.themeColor}22 0%, var(--bg-2) 60%)`,
          padding: '20px 16px 24px',
          textAlign: 'center',
        }}>
          <img
            src={theme.logo}
            alt="Campaign"
            style={{ maxWidth: 220, width: '100%', marginBottom: 12 }}
            onError={(e) => { e.currentTarget.src = theme.logoFallback; }}
          />
          {theme.brands ? (
            <img
              src={theme.brands}
              alt="Partner brands"
              style={{ maxWidth: 240, width: '100%', marginBottom: 10 }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <BrandLogoRow brands={brands} campaign={campaign} />
          )}
          <p style={{ fontSize: '1rem', color: 'var(--text-2)', marginBottom: 0, lineHeight: 1.5 }}>
            {theme.tagline}
          </p>
          {campaign?.name && (
            <p style={{ fontSize: '0.85rem', color: theme.themeColor, marginTop: 8, marginBottom: 0, fontWeight: 600 }}>
              {campaign.name}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-2)',
      borderBottom: '1px solid var(--border)',
      padding: '24px 16px',
      textAlign: 'center',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <img
          src={theme.logo}
          alt={campaign?.name || 'Instant Win'}
          style={{ maxWidth: 220, width: '100%' }}
          onError={(e) => { e.currentTarget.src = theme.logoFallback; }}
        />
      </div>
      {theme.brands ? (
        <div className="hero__brands" style={{ marginBottom: 12 }}>
          <img
            src={theme.brands}
            alt="Partner brands"
            style={{ maxWidth: 200, width: '100%' }}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        </div>
      ) : (
        <BrandLogoRow brands={brands} campaign={campaign} />
      )}
      {campaign?.name && (
        <p style={{ fontSize: '0.95rem', color: theme.themeColor, marginBottom: 8, fontWeight: 600 }}>
          {campaign.name}
        </p>
      )}
      <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', marginBottom: 0 }}>
        {theme.tagline}
      </p>
    </div>
  );
}

function StepIndicator({ step }) {
  const stepLabels = ['Mobile', 'Verify', 'Receipt'];
  const currentStep = step - 1;
  return (
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
  );
}

/**
 * Shared instant-win form: mobile → OTP → receipt capture.
 */
export default function InstantWinForm({
  theme,
  campaign,
  device,
  brands,
  showTokenBar = false,
  token = '',
  timeLeft = null,
  formatTime = () => '--:--',
  onComplete,
  campaignLayout = false,
  campaignArtSrc = '/instant-win/bg.png',
}) {
  const [step, setStep] = useState(FORM_STEPS.MOBILE);
  const [error, setError] = useState('');
  const [mobile, setMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpDemo, setOtpDemo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      setStep(FORM_STEPS.OTP);
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
      setStep(FORM_STEPS.RECEIPT);
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpVerifying(false);
    }
  }

  async function handleReceiptSubmit(receiptData) {
    setError('');
    setSubmitting(true);
    setStep(FORM_STEPS.SUBMITTING);
    try {
      await onComplete({
        mobile: normaliseMobile(mobile),
        ...receiptData,
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
      setStep(FORM_STEPS.RECEIPT);
    }
  }

  if (step === FORM_STEPS.SUBMITTING) {
    return (
      <div className={`page${campaignLayout ? ' page--campaign' : ''}`} style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
          <p style={{ marginTop: 16, color: 'var(--text-2)' }}>Preparing your scratch card...</p>
        </div>
      </div>
    );
  }

  const mobileStep = step === FORM_STEPS.MOBILE && (
    <div className={`card${campaignLayout ? ' campaign-shell__card' : ''}`}>
      <h2 className={campaignLayout ? 'enter-form__title' : undefined} style={campaignLayout ? undefined : { fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Your Mobile Number
      </h2>
      <div className="field">
        <label>Mobile Number *</label>
        <input type="tel" placeholder="0412 345 678" value={mobile}
          onChange={e => { setMobile(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
          autoComplete="tel" autoFocus />
        <span className="field-hint">We'll send a one-time code to verify it's you</span>
      </div>
      <button className="btn btn--primary btn--full" onClick={handleSendOtp} disabled={otpSending}>
        {otpSending
          ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Sending...</>
          : 'Send Code →'}
      </button>
    </div>
  );

  const otpStep = step === FORM_STEPS.OTP && (
    <div className={`card${campaignLayout ? ' campaign-shell__card' : ''}`}>
      <h2 className={campaignLayout ? 'enter-form__title enter-form__title--tight' : undefined} style={campaignLayout ? undefined : { fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Verify Your Number
      </h2>
      <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: 16 }}>Code sent to {mobile}</p>
      {otpDemo && (
        <div className="notice-banner">Demo mode — enter <strong>123456</strong> to verify</div>
      )}
      <div className="field">
        <label>6-Digit Code *</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" inputMode="numeric" maxLength={6} value={otpCode}
            onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '')); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
            placeholder="123456" autoFocus
            style={{ letterSpacing: '0.2em', fontSize: '1.1rem', textAlign: 'center' }} />
          <button type="button" className="btn btn--primary" style={{ whiteSpace: 'nowrap', padding: '0 18px' }}
            onClick={handleVerifyOtp} disabled={otpVerifying || otpCode.length !== 6}>
            {otpVerifying ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Verify'}
          </button>
        </div>
        <span className="field-hint">Code expires in 10 min</span>
      </div>
      <button className="btn btn--ghost btn--full" style={{ fontSize: '0.85rem', padding: '10px' }}
        onClick={() => { setStep(FORM_STEPS.MOBILE); setOtpCode(''); setError(''); }}>
        Change number
      </button>
    </div>
  );

  const receiptStep = step === FORM_STEPS.RECEIPT && (
    <ReceiptCaptureStep
      brands={brands}
      submitting={submitting}
      onBack={() => { setStep(FORM_STEPS.OTP); setError(''); }}
      onSubmit={handleReceiptSubmit}
    />
  );

  if (campaignLayout) {
    return (
      <div className="page page--campaign">
        <CampaignShell artSrc={campaignArtSrc}>
          <div className="campaign-shell__panel">
            <StepIndicator step={step} />
            {error && step !== FORM_STEPS.RECEIPT && <div className="alert alert--error">{error}</div>}
            {mobileStep}
            {otpStep}
            {receiptStep}
            <CampaignLegalFooter storeName={device?.storeName} />
          </div>
        </CampaignShell>
      </div>
    );
  }

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <header className="topbar" style={{ justifyContent: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: '0.08em' }}>POWERED BY PURERANDOM™</span>
      </header>

      <PromoHeader theme={theme} campaign={campaign} brands={brands} />

      <main style={{ flex: 1, padding: '28px 16px' }}>
        <div className="container">
          <StepIndicator step={step} />
          {error && step !== FORM_STEPS.RECEIPT && <div className="alert alert--error">{error}</div>}
          {mobileStep}
          {otpStep}
          {receiptStep}

          {showTokenBar && token && (
            <div className="token-bar">
              <span style={{ color: 'var(--text-3)' }}>
                Token: <span style={{ color: 'var(--text)', fontFamily: 'monospace', letterSpacing: '0.06em' }}>{token}</span>
              </span>
              <span style={{
                color: timeLeft !== null && timeLeft < 60000 ? 'var(--red)' : 'var(--amber)',
                fontFamily: 'monospace', fontWeight: 700, fontSize: '1.05rem',
              }}>
                {formatTime(timeLeft)}
              </span>
            </div>
          )}

          <p className="compliance-note" style={{ marginTop: 12 }}>
            Instant win outcomes are determined by a secure server-side prize manifest prior to reveal.
            {device?.storeName && ` · ${device.storeName}`}
          </p>
        </div>
      </main>
    </div>
  );
}
