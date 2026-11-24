import { useState } from 'react';
import { sendOtp, verifyOtp } from '../api';
import {
  SMIRNOFF_VERIFICATION_METHOD,
  isSmirnoffWin,
  smirnoffProducts,
  smirnoffStoreName,
} from '../campaigns/smirnoff';
import '../campaigns/smirnoff.css';

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

export default function SmirnoffEntryForm({ campaign, onComplete }) {
  const products = smirnoffProducts(campaign);
  const storeName = smirnoffStoreName(campaign);
  const [step, setStep] = useState(STEPS.FORM);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [product, setProduct] = useState(products.length === 1 ? products[0] : '');
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
      setError('Select the Smirnoff product you purchased');
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
        selectedBrand: product,
        spendAmount: 0,
        productDescription: product,
        storeName,
        receiptSource: 'manual',
        verificationMethod: SMIRNOFF_VERIFICATION_METHOD,
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

  const win = isSmirnoffWin(reveal?.result);
  const first = normaliseName(fullName).split(/\s+/)[0];

  return (
    <div className="smirnoff-page">
      <div className="smirnoff-wrap">
        {step === STEPS.FORM && (
          <>
            <p className="smirnoff-kicker">Smirnoff Instant Win</p>
            <h1 className="smirnoff-title">Enter to win</h1>
            <p className="smirnoff-lede">Verify your mobile. Every valid entry is drawn instantly.</p>
            {error && <div className="smirnoff-error" role="alert">{error}</div>}
            <p className="smirnoff-store">{storeName}</p>
            <div className="smirnoff-field">
              <label htmlFor="smirnoff-name">Full name</label>
              <input
                id="smirnoff-name"
                type="text"
                autoComplete="name"
                placeholder="Full name"
                value={fullName}
                onChange={(e) => { setFullName(e.target.value); setError(''); }}
              />
            </div>
            <div className="smirnoff-field">
              <label htmlFor="smirnoff-mobile">Mobile number</label>
              <input
                id="smirnoff-mobile"
                type="tel"
                autoComplete="tel"
                placeholder="0412 345 678"
                value={mobile}
                onChange={(e) => { setMobile(e.target.value); setError(''); }}
              />
            </div>
            <div className="smirnoff-field">
              <label htmlFor="smirnoff-product">Product purchased</label>
              <select
                id="smirnoff-product"
                value={product}
                onChange={(e) => { setProduct(e.target.value); setError(''); }}
              >
                {products.length > 1 && <option value="">Select</option>}
                {products.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <button className="smirnoff-cta" type="button" onClick={handleVerifyAndEnter} disabled={otpSending}>
              {otpSending ? 'Sending code…' : 'Verify & enter'}
            </button>
          </>
        )}

        {step === STEPS.OTP && (
          <>
            <p className="smirnoff-kicker">Smirnoff Instant Win</p>
            <h1 className="smirnoff-title">Verify your mobile</h1>
            <p className="smirnoff-lede">Enter the code sent to {mobile}</p>
            {error && <div className="smirnoff-error" role="alert">{error}</div>}
            {otpDemo && <div className="smirnoff-demo">Demo mode — enter <strong>123456</strong></div>}
            <div className="smirnoff-field">
              <label htmlFor="smirnoff-otp">6-digit code</label>
              <input
                id="smirnoff-otp"
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
              className="smirnoff-cta"
              type="button"
              onClick={handleVerifyOtp}
              disabled={otpVerifying || otpCode.length !== 6}
            >
              {otpVerifying ? 'Verifying…' : 'Confirm & reveal'}
            </button>
            <button
              className="smirnoff-ghost"
              type="button"
              onClick={() => { setStep(STEPS.FORM); setOtpCode(''); setError(''); }}
            >
              Change details
            </button>
          </>
        )}

        {step === STEPS.SUBMITTING && (
          <>
            <h1 className="smirnoff-title">Revealing your prize</h1>
            <p className="smirnoff-lede">This only takes a moment.</p>
          </>
        )}

        {step === STEPS.REVEAL && win && (
          <div className="smirnoff-win">
            <p className="smirnoff-kicker">Smirnoff Instant Win</p>
            <h1 className="smirnoff-title">Congratulations{first ? ` ${first}` : ''}!</h1>
            <p className="smirnoff-lede">You&apos;ve won</p>
            <p className="smirnoff-prize">{reveal?.prizeName || 'Smirnoff prize'}</p>
            <p className="smirnoff-lede">
              A text message with your winning QR code is on its way. Redeem within 30 minutes at {storeName}.
            </p>
            {reveal?.redemptionCode && (
              <div>
                <span className="smirnoff-code-label">Redemption code</span>
                <div className="smirnoff-code">{reveal.redemptionCode}</div>
              </div>
            )}
          </div>
        )}

        {step === STEPS.REVEAL && !win && (
          <>
            <h1 className="smirnoff-title">Thanks for entering</h1>
            <p className="smirnoff-lede">We couldn&apos;t assign a prize this time. Please try again or speak to staff.</p>
          </>
        )}
      </div>
    </div>
  );
}
