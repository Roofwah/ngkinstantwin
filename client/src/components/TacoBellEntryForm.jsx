import { useState } from 'react';
import { sendOtp, verifyOtp } from '../api';
import TacoBellEntryShell from './TacoBellEntryShell';
import StaffWinCode from './StaffWinCode';
import {
  TACO_BELL_REGION,
  TACO_BELL_VERIFICATION_METHOD,
  tacoBellItems,
  tacoBellLandingArt,
  tacoBellStoreName,
  isTacoBellWin,
  isValidTacoBellReceiptTail,
} from '../campaigns/tacoBell';
import {
  campaignRegion,
  isValidMobileForRegion,
  normaliseMobileForRegion,
} from '../lib/regions';

function normaliseName(raw) {
  return String(raw || '').trim().replace(/\s+/g, ' ');
}

function isValidName(name) {
  return name.length >= 2 && /^[A-Za-z][A-Za-z\s'.-]*$/.test(name);
}

const STEPS = { FORM: 1, OTP: 2, SUBMITTING: 3, REVEAL: 4 };

export default function TacoBellEntryForm({ campaign, onComplete }) {
  const items = tacoBellItems(campaign);
  const storeName = tacoBellStoreName(campaign);
  const region = campaignRegion(campaign?.config?.region ? campaign : { config: { region: TACO_BELL_REGION } });

  const [step, setStep] = useState(STEPS.FORM);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [menuItem, setMenuItem] = useState('');
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
    const norm = normaliseMobileForRegion(mobile, region.id);
    if (!isValidMobileForRegion(norm, region.id)) {
      setError(region.invalidMobileMessage);
      return;
    }
    if (!menuItem) {
      setError('Select the menu item you purchased');
      return;
    }
    if (!isValidTacoBellReceiptTail(receiptTail)) {
      setError('Enter the last 4 digits of your receipt');
      return;
    }

    setOtpSending(true);
    try {
      const res = await sendOtp(norm, region.id);
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
    const norm = normaliseMobileForRegion(mobile, region.id);
    setOtpVerifying(true);
    try {
      await verifyOtp(norm, otpCode, region.id);
      setStep(STEPS.SUBMITTING);
      const outcome = await onComplete({
        customerName: normaliseName(fullName),
        mobile: norm,
        invoiceNumber: receiptTail.trim(),
        contractNumber: receiptTail.trim(),
        selectedBrand: menuItem,
        spendAmount: 0,
        productDescription: menuItem,
        storeName,
        receiptSource: 'manual',
        verificationMethod: TACO_BELL_VERIFICATION_METHOD,
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

  const win = isTacoBellWin(reveal?.result);
  const first = normaliseName(fullName).split(/\s+/)[0];
  const landingSrc = tacoBellLandingArt(campaign);
  const showLanding = step === STEPS.FORM || step === STEPS.OTP;

  return (
    <TacoBellEntryShell landingSrc={landingSrc} showLanding={showLanding}>
      {step === STEPS.FORM && (
        <div className="taco-bell-form">
          <p className="taco-bell-kicker">Taco Bell · United States</p>
          <h1 className="taco-bell-title">Instant Win</h1>
          <p className="taco-bell-lede">Enter your details to reveal your prize.</p>

          {error && <div className="taco-bell-error" role="alert">{error}</div>}

          <div className="taco-bell-field">
            <label htmlFor="tb-name">Full name</label>
            <input
              id="tb-name"
              type="text"
              autoComplete="name"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(''); }}
            />
          </div>
          <div className="taco-bell-field">
            <label htmlFor="tb-mobile">US mobile number</label>
            <input
              id="tb-mobile"
              type="tel"
              autoComplete="tel"
              placeholder={region.mobileHint}
              value={mobile}
              onChange={(e) => { setMobile(e.target.value); setError(''); }}
            />
          </div>
          <div className="taco-bell-field">
            <label>Store</label>
            <div className="taco-bell-store">{storeName}</div>
          </div>
          <div className="taco-bell-field">
            <label htmlFor="tb-item">Menu item</label>
            <select
              id="tb-item"
              value={menuItem}
              onChange={(e) => { setMenuItem(e.target.value); setError(''); }}
            >
              <option value="">Select</option>
              {items.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="taco-bell-field">
            <label htmlFor="tb-receipt">Last 4 digits of receipt</label>
            <input
              id="tb-receipt"
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
            className="taco-bell-cta"
            type="button"
            onClick={handleVerifyAndEnter}
            disabled={otpSending}
          >
            <span>{otpSending ? 'Sending code…' : 'Verify & enter'}</span>
          </button>

          <p className="taco-bell-legal">
            By continuing you agree to the promotion terms. A one-time code will be sent to your US mobile.
          </p>
        </div>
      )}

      {step === STEPS.OTP && (
        <div className="taco-bell-form">
          <p className="taco-bell-kicker">Taco Bell · United States</p>
          <h1 className="taco-bell-title">Verify your mobile</h1>
          <p className="taco-bell-lede">Enter the code sent to {mobile}</p>

          {error && <div className="taco-bell-error" role="alert">{error}</div>}
          {otpDemo && (
            <div className="taco-bell-demo">Demo mode — enter <strong>123456</strong></div>
          )}

          <div className="taco-bell-field">
            <label htmlFor="tb-otp">6-digit code</label>
            <input
              id="tb-otp"
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
            className="taco-bell-cta"
            type="button"
            onClick={handleVerifyOtp}
            disabled={otpVerifying || otpCode.length !== 6}
          >
            <span>{otpVerifying ? 'Verifying…' : 'Confirm & reveal'}</span>
          </button>

          <button
            className="taco-bell-ghost"
            type="button"
            onClick={() => { setStep(STEPS.FORM); setOtpCode(''); setError(''); }}
          >
            Change details
          </button>
        </div>
      )}

      {step === STEPS.SUBMITTING && (
        <div className="taco-bell-form">
          <h1 className="taco-bell-title">Revealing your prize</h1>
          <p className="taco-bell-lede">This only takes a moment.</p>
        </div>
      )}

      {step === STEPS.REVEAL && win && (
        <div className="taco-bell-form">
          <div className="taco-bell-result taco-bell-result--win">
            <p className="taco-bell-kicker">Taco Bell Instant Win</p>
            <h1>Congratulations{first ? ` ${first}` : ''}!</h1>
            <p className="taco-bell-lede taco-bell-lede--emphasis">You&apos;ve won</p>
            <div className="taco-bell-prize">
              <p className="taco-bell-prize-name">{reveal?.prizeName || 'Free Crunchwrap Supreme'}</p>
              {reveal?.prizeValue != null && (
                <p className="taco-bell-prize-value">${Number(reveal.prizeValue).toFixed(0)} value</p>
              )}
            </div>
            <p className="taco-bell-staff-msg">
              Redemption instructions have been sent to your mobile.
            </p>
            <StaffWinCode url={reveal?.staffScanUrl} store={reveal?.storeName} />
            {reveal?.redemptionCode ? (
              <div className="taco-bell-ref">
                <span className="taco-bell-ref__label">Reference number</span>
                <div className="taco-bell-code">{reveal.redemptionCode}</div>
              </div>
            ) : (
              <p className="taco-bell-lede">Your reference is being generated — check your SMS shortly.</p>
            )}
          </div>
        </div>
      )}

      {step === STEPS.REVEAL && !win && (
        <div className="taco-bell-form">
          <div className="taco-bell-result">
            <h1 className="taco-bell-title">Thanks for entering</h1>
            <p className="taco-bell-lede">We couldn&apos;t assign a prize this time. Please try again or speak to staff.</p>
          </div>
        </div>
      )}
    </TacoBellEntryShell>
  );
}
