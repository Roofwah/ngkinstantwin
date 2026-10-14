import { useState } from 'react';
import { sendOtp, verifyOtp } from '../api';
import CastrolEntryShell from './CastrolEntryShell';
import {
  CASTROL_VERIFICATION_METHOD,
  castrolLandingArt,
  castrolProducts,
  castrolStoreName,
  isCastrolWin,
  isValidCastrolReceiptTail,
} from '../campaigns/castrol';

function normaliseMobile(raw) {
  const s = raw.replace(/[\s\-()]/g, '');
  if (/^\+614/.test(s)) return '0' + s.slice(3);
  return s;
}

function normaliseName(raw) {
  return String(raw || '').trim().replace(/\s+/g, ' ');
}

function isValidName(name) {
  return name.length >= 2 && /^[A-Za-z][A-Za-z\s'.-]*$/.test(name);
}

const STEPS = { FORM: 1, OTP: 2, SUBMITTING: 3, REVEAL: 4 };

export default function CastrolEntryForm({ campaign, onComplete }) {
  const products = castrolProducts(campaign);
  const storeName = castrolStoreName(campaign);

  const [step, setStep] = useState(STEPS.FORM);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [product, setProduct] = useState('');
  const [receiptTail, setReceiptTail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpDemo, setOtpDemo] = useState(false);
  const [reveal, setReveal] = useState(null);

  async function handleVerifyAndEnter() {
    setError('');
    const name = normaliseName(fullName);
    if (!isValidName(name)) {
      setError('Enter your full name');
      return;
    }
    const norm = normaliseMobile(mobile);
    if (!/^04\d{8}$/.test(norm)) {
      setError('Enter a valid mobile (04XX XXX XXX)');
      return;
    }
    if (!product) {
      setError('Select the Castrol product you purchased');
      return;
    }
    if (!isValidCastrolReceiptTail(receiptTail)) {
      setError('Enter the last 4 digits of your receipt or invoice');
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
    if (otpCode.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    const norm = normaliseMobile(mobile);
    setOtpVerifying(true);
    try {
      await verifyOtp(norm, otpCode);
      setStep(STEPS.SUBMITTING);
      const outcome = await onComplete({
        customerName: normaliseName(fullName),
        mobile: norm,
        invoiceNumber: receiptTail.trim(),
        contractNumber: receiptTail.trim(),
        selectedBrand: product,
        spendAmount: 0,
        productDescription: product,
        storeName,
        receiptSource: 'manual',
        verificationMethod: CASTROL_VERIFICATION_METHOD,
      });
      if (outcome?.claimId) {
        setReveal(outcome);
        setStep(STEPS.REVEAL);
      }
    } catch (err) {
      setError(err.message);
      setStep(STEPS.OTP);
    } finally {
      setOtpVerifying(false);
    }
  }

  const win = isCastrolWin(reveal?.result);
  const first = normaliseName(fullName).split(/\s+/)[0];
  const landingSrc = castrolLandingArt(campaign);
  const showLanding = step === STEPS.FORM || step === STEPS.OTP;

  return (
    <CastrolEntryShell landingSrc={landingSrc} showLanding={showLanding}>
      {step === STEPS.FORM && (
        <div className="castrol-form">
          <p className="castrol-kicker">Castrol · Power Up &amp; Win</p>
          <h1 className="castrol-title">Instant Win</h1>
          <p className="castrol-lede">Verify your mobile — every valid entry wins a prize.</p>

          {error && <div className="castrol-error" role="alert">{error}</div>}

          <div className="castrol-field">
            <label htmlFor="castrol-name">Full name</label>
            <input
              id="castrol-name"
              type="text"
              autoComplete="name"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(''); }}
            />
          </div>
          <div className="castrol-field">
            <label htmlFor="castrol-mobile">Mobile number</label>
            <input
              id="castrol-mobile"
              type="tel"
              autoComplete="tel"
              placeholder="0412 345 678"
              value={mobile}
              onChange={(e) => { setMobile(e.target.value); setError(''); }}
            />
          </div>
          <div className="castrol-field">
            <label>Store</label>
            <div className="castrol-store">{storeName}</div>
          </div>
          <div className="castrol-field">
            <label htmlFor="castrol-product">Castrol product purchased</label>
            <select
              id="castrol-product"
              value={product}
              onChange={(e) => { setProduct(e.target.value); setError(''); }}
            >
              <option value="">Select</option>
              {products.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="castrol-field">
            <label htmlFor="castrol-receipt">Last 4 digits of receipt / invoice</label>
            <input
              id="castrol-receipt"
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={receiptTail}
              onChange={(e) => {
                setReceiptTail(e.target.value.replace(/\D/g, '').slice(0, 4));
                setError('');
              }}
            />
          </div>

          <button
            className="castrol-cta"
            type="button"
            onClick={handleVerifyAndEnter}
            disabled={otpSending}
          >
            <span>{otpSending ? 'Sending code…' : 'Verify & enter'}</span>
          </button>

          <p className="castrol-legal">
            By continuing you agree to the promotion terms. Outcomes are determined after mobile verification.
          </p>
        </div>
      )}

      {step === STEPS.OTP && (
        <div className="castrol-form">
          <p className="castrol-kicker">Castrol · Power Up &amp; Win</p>
          <h1 className="castrol-title">Verify your mobile</h1>
          <p className="castrol-lede">Enter the code sent to {mobile}</p>

          {error && <div className="castrol-error" role="alert">{error}</div>}
          {otpDemo && (
            <div className="castrol-demo">Demo mode — enter <strong>123456</strong></div>
          )}

          <div className="castrol-field">
            <label htmlFor="castrol-otp">6-digit code</label>
            <input
              id="castrol-otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              autoFocus
              onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '')); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
            />
          </div>

          <button
            className="castrol-cta"
            type="button"
            onClick={handleVerifyOtp}
            disabled={otpVerifying || otpCode.length !== 6}
          >
            <span>{otpVerifying ? 'Verifying…' : 'Confirm & reveal'}</span>
          </button>

          <button
            className="castrol-ghost"
            type="button"
            onClick={() => { setStep(STEPS.FORM); setOtpCode(''); setError(''); }}
          >
            Change details
          </button>
        </div>
      )}

      {step === STEPS.SUBMITTING && (
        <div className="castrol-form">
          <h1 className="castrol-title">Revealing your prize</h1>
          <p className="castrol-lede">This only takes a moment.</p>
        </div>
      )}

      {step === STEPS.REVEAL && win && (
        <div className="castrol-form">
          <div className="castrol-result castrol-result--win">
            <p className="castrol-kicker">Castrol Instant Win</p>
            <h1>Congratulations{first ? ` ${first}` : ''}!</h1>
            <p className="castrol-lede castrol-lede--emphasis">You&apos;ve won</p>
            <div className="castrol-prize">
              <p className="castrol-prize-name">{reveal?.prizeName || 'Castrol prize'}</p>
              {reveal?.prizeValue != null && (
                <p className="castrol-prize-value">${Number(reveal.prizeValue).toFixed(0)} value</p>
              )}
            </div>
            <p className="castrol-staff-msg">
              Redemption instructions have been sent to your mobile.
            </p>
            {reveal?.redemptionCode ? (
              <div className="castrol-ref">
                <span className="castrol-ref__label">Reference number</span>
                <div className="castrol-code">{reveal.redemptionCode}</div>
              </div>
            ) : (
              <p className="castrol-lede">Your reference is being generated — check your SMS shortly.</p>
            )}
          </div>
        </div>
      )}

      {step === STEPS.REVEAL && !win && (
        <div className="castrol-form">
          <div className="castrol-result">
            <h1 className="castrol-title">Thanks for entering</h1>
            <p className="castrol-lede">We couldn&apos;t assign a prize this time. Please try again or speak to staff.</p>
          </div>
        </div>
      )}
    </CastrolEntryShell>
  );
}
