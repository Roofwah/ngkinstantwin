import { useState } from 'react';
import { sendOtp, verifyOtp } from '../api';
import LovesEntryShell from './LovesEntryShell';
import StaffWinCode from './StaffWinCode';
import {
  LOVES_DEFAULT_BRAND,
  LOVES_REGION,
  LOVES_VERIFICATION_METHOD,
  lovesStoreName,
  lovesPrizeImage,
  isLovesWin,
} from '../campaigns/loves';
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

/** Loves Travel Stop — name + mobile only (Guinness shape). US mobiles. */
export default function LovesEntryForm({ campaign, onComplete }) {
  const storeName = lovesStoreName(campaign);
  const region = campaignRegion(campaign?.config?.region ? campaign : { config: { region: LOVES_REGION } });

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
    const norm = normaliseMobileForRegion(mobile, region.id);
    if (!isValidMobileForRegion(norm, region.id)) {
      setError(region.invalidMobileMessage);
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
        selectedBrand: LOVES_DEFAULT_BRAND,
        spendAmount: 0,
        productDescription: LOVES_DEFAULT_BRAND,
        storeName,
        receiptSource: 'not_required',
        verificationMethod: LOVES_VERIFICATION_METHOD,
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

  const win = isLovesWin(reveal?.result);
  const first = normaliseName(fullName).split(/\s+/)[0];

  return (
    <LovesEntryShell>
      {step === STEPS.FORM && (
        <div className="loves-form">
          <p className="loves-kicker">Loves · {storeName}</p>
          <h1 className="loves-title">Enter to win</h1>
          <p className="loves-lede">Enter your details to reveal your prize.</p>

          {error && <div className="loves-error" role="alert">{error}</div>}

          <div className="loves-field">
            <label htmlFor="loves-name">Full name</label>
            <input
              id="loves-name"
              type="text"
              autoComplete="name"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(''); }}
            />
          </div>
          <div className="loves-field">
            <label htmlFor="loves-mobile">Mobile number</label>
            <input
              id="loves-mobile"
              type="tel"
              autoComplete="tel"
              placeholder={region.mobileHint || '(555) 123-4567'}
              value={mobile}
              onChange={(e) => { setMobile(e.target.value); setError(''); }}
            />
          </div>
          <div className="loves-field">
            <label>Store</label>
            <div className="loves-store">{storeName}</div>
          </div>

          <button
            className="loves-cta"
            type="button"
            onClick={handleVerifyAndEnter}
            disabled={otpSending}
          >
            <span>{otpSending ? 'Sending code…' : 'Verify & enter'}</span>
          </button>

          <p className="loves-legal">
            By continuing you agree to the promotion terms. Outcomes are determined after mobile verification.
          </p>
        </div>
      )}

      {step === STEPS.OTP && (
        <div className="loves-form">
          <p className="loves-kicker">Loves · {storeName}</p>
          <h1 className="loves-title">Verify your mobile</h1>
          <p className="loves-lede">Enter the code sent to {mobile}</p>

          {error && <div className="loves-error" role="alert">{error}</div>}
          {otpDemo && (
            <div className="loves-demo">Demo mode — enter <strong>123456</strong></div>
          )}

          <div className="loves-field">
            <label htmlFor="loves-otp">6-digit code</label>
            <input
              id="loves-otp"
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
            className="loves-cta"
            type="button"
            onClick={handleVerifyOtp}
            disabled={otpVerifying || otpCode.length !== 6}
          >
            <span>{otpVerifying ? 'Verifying…' : 'Confirm & reveal'}</span>
          </button>

          <button
            className="loves-ghost"
            type="button"
            onClick={() => { setStep(STEPS.FORM); setOtpCode(''); setError(''); }}
          >
            Change details
          </button>
        </div>
      )}

      {step === STEPS.SUBMITTING && (
        <div className="loves-form">
          <h1 className="loves-title">Revealing your prize</h1>
          <p className="loves-lede">This only takes a moment.</p>
        </div>
      )}

      {step === STEPS.REVEAL && win && (
        <div className="loves-form">
          <div className="loves-result loves-result--win">
            <p className="loves-kicker">Loves · {storeName}</p>
            <h1>Congratulations{first ? ` ${first}` : ''}!</h1>
            <p className="loves-lede loves-lede--emphasis">You&apos;ve won</p>
            <div className="loves-prize loves-prize--reveal">
              {lovesPrizeImage(reveal?.prizeName) && (
                <img
                  className="loves-prize-img"
                  src={lovesPrizeImage(reveal.prizeName)}
                  alt={reveal.prizeName || 'Prize'}
                />
              )}
              <p className="loves-prize-name">{reveal?.prizeName || 'Prize'}</p>
              {reveal?.prizeValue != null && (
                <p className="loves-prize-value">${reveal.prizeValue}</p>
              )}
            </div>
            <p className="loves-staff-msg">
              Show this to staff at {storeName} to redeem.
            </p>
            <StaffWinCode url={reveal?.staffScanUrl} store={reveal?.storeName || storeName} />
            {reveal?.redemptionCode ? (
              <div className="loves-ref">
                <span className="loves-ref__label">Reference number</span>
                <div className="loves-code">{reveal.redemptionCode}</div>
              </div>
            ) : (
              <p className="loves-lede">Your reference is being generated — check your SMS shortly.</p>
            )}
          </div>
        </div>
      )}

      {step === STEPS.REVEAL && !win && (
        <div className="loves-form">
          <div className="loves-result">
            <h1 className="loves-title">Thanks for entering</h1>
            <p className="loves-lede">We couldn&apos;t assign a prize this time. Please try again or speak to staff.</p>
          </div>
        </div>
      )}
    </LovesEntryShell>
  );
}
