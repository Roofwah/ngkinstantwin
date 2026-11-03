import { useState } from 'react';
import { sendOtp, verifyOtp } from '../api';
import HankookEntryShell from './HankookEntryShell';
import StaffWinCode from './StaffWinCode';
import {
  HANKOOK_VERIFICATION_METHOD,
  hankookLines,
  hankookStoreName,
  isHankookWin,
  isValidHankookReceiptTail,
} from '../campaigns/hankook';

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

export default function HankookEntryForm({ campaign, onComplete }) {
  const lines = hankookLines(campaign);
  const storeName = hankookStoreName(campaign);

  const [step, setStep] = useState(STEPS.FORM);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [tyreLine, setTyreLine] = useState('');
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
    if (!tyreLine) {
      setError('Select the Hankook tyre line you purchased');
      return;
    }
    if (!isValidHankookReceiptTail(receiptTail)) {
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
        selectedBrand: tyreLine,
        spendAmount: 0,
        productDescription: tyreLine,
        storeName,
        receiptSource: 'manual',
        verificationMethod: HANKOOK_VERIFICATION_METHOD,
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

  const win = isHankookWin(reveal?.result);
  const first = normaliseName(fullName).split(/\s+/)[0];

  return (
    <HankookEntryShell>
      {step === STEPS.FORM && (
        <div className="hankook-form">
          <p className="hankook-kicker">Hankook · Driving Emotion</p>
          <h1 className="hankook-title">Instant Win</h1>
          <p className="hankook-lede">Buy 4 tyres to enter — every valid entry wins $200 cashback.</p>

          {error && <div className="hankook-error" role="alert">{error}</div>}

          <div className="hankook-field">
            <label htmlFor="hankook-name">Full name</label>
            <input
              id="hankook-name"
              type="text"
              autoComplete="name"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(''); }}
            />
          </div>
          <div className="hankook-field">
            <label htmlFor="hankook-mobile">Mobile number</label>
            <input
              id="hankook-mobile"
              type="tel"
              autoComplete="tel"
              placeholder="0412 345 678"
              value={mobile}
              onChange={(e) => { setMobile(e.target.value); setError(''); }}
            />
          </div>
          <div className="hankook-field">
            <label>Store</label>
            <div className="hankook-store">{storeName}</div>
          </div>
          <div className="hankook-field">
            <label htmlFor="hankook-line">Hankook tyre line</label>
            <select
              id="hankook-line"
              value={tyreLine}
              onChange={(e) => { setTyreLine(e.target.value); setError(''); }}
            >
              <option value="">Select</option>
              {lines.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="hankook-field">
            <label htmlFor="hankook-receipt">Last 4 digits of receipt / invoice</label>
            <input
              id="hankook-receipt"
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
            className="hankook-cta"
            type="button"
            onClick={handleVerifyAndEnter}
            disabled={otpSending}
          >
            <span>{otpSending ? 'Sending code…' : 'Verify & enter'}</span>
          </button>

          <p className="hankook-legal">
            By continuing you agree to the promotion terms. Outcomes are determined after mobile verification.
          </p>
        </div>
      )}

      {step === STEPS.OTP && (
        <div className="hankook-form">
          <p className="hankook-kicker">Hankook · Driving Emotion</p>
          <h1 className="hankook-title">Verify your mobile</h1>
          <p className="hankook-lede">Enter the code sent to {mobile}</p>

          {error && <div className="hankook-error" role="alert">{error}</div>}
          {otpDemo && (
            <div className="hankook-demo">Demo mode — enter <strong>123456</strong></div>
          )}

          <div className="hankook-field">
            <label htmlFor="hankook-otp">6-digit code</label>
            <input
              id="hankook-otp"
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
            className="hankook-cta"
            type="button"
            onClick={handleVerifyOtp}
            disabled={otpVerifying || otpCode.length !== 6}
          >
            <span>{otpVerifying ? 'Verifying…' : 'Confirm & reveal'}</span>
          </button>

          <button
            className="hankook-ghost"
            type="button"
            onClick={() => { setStep(STEPS.FORM); setOtpCode(''); setError(''); }}
          >
            Change details
          </button>
        </div>
      )}

      {step === STEPS.SUBMITTING && (
        <div className="hankook-form">
          <h1 className="hankook-title">Revealing your prize</h1>
          <p className="hankook-lede">This only takes a moment.</p>
        </div>
      )}

      {step === STEPS.REVEAL && win && (
        <div className="hankook-form">
          <div className="hankook-result hankook-result--win">
            <p className="hankook-kicker">Hankook Instant Win</p>
            <h1>Congratulations{first ? ` ${first}` : ''}!</h1>
            <p className="hankook-lede hankook-lede--emphasis">You&apos;ve won</p>
            <div className="hankook-prize">
              <p className="hankook-prize-name">{reveal?.prizeName || '$200 Cashback'}</p>
              {reveal?.prizeValue != null && (
                <p className="hankook-prize-value">${Number(reveal.prizeValue).toFixed(0)} value</p>
              )}
            </div>
            <p className="hankook-staff-msg">
              Redemption instructions have been sent to your mobile.
            </p>
            <StaffWinCode url={reveal?.staffScanUrl} store={reveal?.storeName} />
            {reveal?.redemptionCode ? (
              <div className="hankook-ref">
                <span className="hankook-ref__label">Reference number</span>
                <div className="hankook-code">{reveal.redemptionCode}</div>
              </div>
            ) : (
              <p className="hankook-lede">Your reference is being generated — check your SMS shortly.</p>
            )}
          </div>
        </div>
      )}

      {step === STEPS.REVEAL && !win && (
        <div className="hankook-form">
          <div className="hankook-result">
            <h1 className="hankook-title">Thanks for entering</h1>
            <p className="hankook-lede">We couldn&apos;t assign a prize this time. Please try again or speak to staff.</p>
          </div>
        </div>
      )}
    </HankookEntryShell>
  );
}
