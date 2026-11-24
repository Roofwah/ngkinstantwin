import { useState } from 'react';
import { sendOtp, verifyOtp } from '../api';
import GuinnessEntryShell from './GuinnessEntryShell';
import StaffWinCode from './StaffWinCode';
import {
  GUINNESS_DEFAULT_BRAND,
  GUINNESS_VERIFICATION_METHOD,
  guinnessStoreName,
  guinnessPrizeImage,
  isGuinnessWin,
} from '../campaigns/guinness';

function normaliseMobile(raw) {
  const s = raw.replace(/[\s\-()]/g, '');
  if (/^\+614/.test(s)) return `0${s.slice(3)}`;
  return s;
}

function normaliseName(raw) {
  return String(raw || '').trim().replace(/\s+/g, ' ');
}

function isValidName(name) {
  return name.length >= 2 && /^[A-Za-z][A-Za-z\s'.-]*$/.test(name);
}

const STEPS = { FORM: 1, OTP: 2, SUBMITTING: 3, REVEAL: 4 };

/** Shamrock Arms — name + mobile only (no receipt / product fields). */
export default function GuinnessEntryForm({ campaign, onComplete }) {
  const storeName = guinnessStoreName(campaign);

  const [step, setStep] = useState(STEPS.FORM);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
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
        selectedBrand: GUINNESS_DEFAULT_BRAND,
        spendAmount: 0,
        productDescription: GUINNESS_DEFAULT_BRAND,
        storeName,
        receiptSource: 'not_required',
        verificationMethod: GUINNESS_VERIFICATION_METHOD,
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

  const win = isGuinnessWin(reveal?.result);
  const first = normaliseName(fullName).split(/\s+/)[0];

  return (
    <GuinnessEntryShell>
      {step === STEPS.FORM && (
        <div className="guinness-form">
          <p className="guinness-kicker">Guinness · {storeName}</p>
          <h1 className="guinness-title">Enter to win</h1>
          <p className="guinness-lede">Enter your details to reveal your prize.</p>

          {error && <div className="guinness-error" role="alert">{error}</div>}

          <div className="guinness-field">
            <label htmlFor="guinness-name">Full name</label>
            <input
              id="guinness-name"
              type="text"
              autoComplete="name"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(''); }}
            />
          </div>
          <div className="guinness-field">
            <label htmlFor="guinness-mobile">Mobile number</label>
            <input
              id="guinness-mobile"
              type="tel"
              autoComplete="tel"
              placeholder="0412 345 678"
              value={mobile}
              onChange={(e) => { setMobile(e.target.value); setError(''); }}
            />
          </div>
          <div className="guinness-field">
            <label>Venue</label>
            <div className="guinness-store">{storeName}</div>
          </div>

          <button
            className="guinness-cta"
            type="button"
            onClick={handleVerifyAndEnter}
            disabled={otpSending}
          >
            <span>{otpSending ? 'Sending code…' : 'Verify & enter'}</span>
          </button>

          <p className="guinness-legal">
            By continuing you agree to the promotion terms. Outcomes are determined after mobile verification.
          </p>
        </div>
      )}

      {step === STEPS.OTP && (
        <div className="guinness-form">
          <p className="guinness-kicker">Guinness · {storeName}</p>
          <h1 className="guinness-title">Verify your mobile</h1>
          <p className="guinness-lede">Enter the code sent to {mobile}</p>

          {error && <div className="guinness-error" role="alert">{error}</div>}
          {otpDemo && (
            <div className="guinness-demo">Demo mode — enter <strong>123456</strong></div>
          )}

          <div className="guinness-field">
            <label htmlFor="guinness-otp">6-digit code</label>
            <input
              id="guinness-otp"
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
            className="guinness-cta"
            type="button"
            onClick={handleVerifyOtp}
            disabled={otpVerifying || otpCode.length !== 6}
          >
            <span>{otpVerifying ? 'Verifying…' : 'Confirm & reveal'}</span>
          </button>

          <button
            className="guinness-ghost"
            type="button"
            onClick={() => { setStep(STEPS.FORM); setOtpCode(''); setError(''); }}
          >
            Change details
          </button>
        </div>
      )}

      {step === STEPS.SUBMITTING && (
        <div className="guinness-form">
          <h1 className="guinness-title">Revealing your prize</h1>
          <p className="guinness-lede">This only takes a moment.</p>
        </div>
      )}

      {step === STEPS.REVEAL && win && (
        <div className="guinness-form">
          <div className="guinness-result guinness-result--win">
            <p className="guinness-kicker">Guinness · {storeName}</p>
            <h1>Congratulations{first ? ` ${first}` : ''}!</h1>
            <p className="guinness-lede guinness-lede--emphasis">You&apos;ve won</p>
            <div className="guinness-prize guinness-prize--reveal">
              {guinnessPrizeImage(reveal?.prizeName) && (
                <img
                  className="guinness-prize-img"
                  src={guinnessPrizeImage(reveal.prizeName)}
                  alt={reveal.prizeName || 'Prize'}
                />
              )}
              <p className="guinness-prize-name">{reveal?.prizeName || 'Prize'}</p>
              {reveal?.prizeValue != null && (
                <p className="guinness-prize-value">${reveal.prizeValue}</p>
              )}
            </div>
            <p className="guinness-staff-msg">
              Show this to staff at {storeName} to redeem.
            </p>
            <StaffWinCode url={reveal?.staffScanUrl} store={reveal?.storeName || storeName} />
            {reveal?.redemptionCode ? (
              <div className="guinness-ref">
                <span className="guinness-ref__label">Reference number</span>
                <div className="guinness-code">{reveal.redemptionCode}</div>
              </div>
            ) : (
              <p className="guinness-lede">Your reference is being generated — check your SMS shortly.</p>
            )}
          </div>
        </div>
      )}

      {step === STEPS.REVEAL && !win && (
        <div className="guinness-form">
          <div className="guinness-result">
            <h1 className="guinness-title">Thanks for entering</h1>
            <p className="guinness-lede">We couldn&apos;t assign a prize this time. Please try again or speak to staff.</p>
          </div>
        </div>
      )}
    </GuinnessEntryShell>
  );
}
