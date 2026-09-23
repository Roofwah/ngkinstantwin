import { useState } from 'react';
import { sendOtp, verifyOtp } from '../api';
import FordEntryShell from './FordEntryShell';
import FordVoucherCounter from './FordVoucherCounter';
import {
  FORD_VERIFICATION_METHOD,
  FORD_VOUCHER_NAME,
  fordDealerName,
  fordLandingArt,
  fordVehicles,
  isFordWin,
  isValidFordContractNumber,
} from '../campaigns/ford';

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

export default function FordEntryForm({
  campaign,
  vehicles: vehiclesProp,
  onComplete,
}) {
  const vehicles = vehiclesProp?.length ? vehiclesProp : fordVehicles(campaign);
  const dealerName = fordDealerName(campaign);

  const [step, setStep] = useState(STEPS.FORM);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [contractNumber, setContractNumber] = useState('');
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
    if (!vehicle) {
      setError('Select your purchased vehicle');
      return;
    }
    if (!isValidFordContractNumber(contractNumber)) {
      setError('Enter the last 4 digits of your sales contract number');
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
        invoiceNumber: contractNumber.trim(),
        contractNumber: contractNumber.trim(),
        selectedBrand: vehicle,
        spendAmount: 0,
        productDescription: vehicle,
        storeName: dealerName,
        receiptSource: 'manual',
        verificationMethod: FORD_VERIFICATION_METHOD,
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

  const win = isFordWin(reveal?.result);
  const first = normaliseName(fullName).split(/\s+/)[0];
  const landingSrc = fordLandingArt(campaign);
  const showLanding = step === STEPS.FORM || step === STEPS.OTP;

  return (
    <FordEntryShell landingSrc={landingSrc} showLanding={showLanding}>
      {step === STEPS.FORM && (
        <div className="ford-form">
          <p className="ford-kicker">Ford · Go Further</p>
          <h1 className="ford-title">Instant Win</h1>
          <p className="ford-lede">Verify your mobile to check your instant win result.</p>

          {error && <div className="ford-error" role="alert">{error}</div>}

          <div className="ford-field">
            <label htmlFor="ford-name">Full name</label>
            <input
              id="ford-name"
              type="text"
              autoComplete="name"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(''); }}
            />
          </div>
          <div className="ford-field">
            <label htmlFor="ford-mobile">Mobile number</label>
            <input
              id="ford-mobile"
              type="tel"
              autoComplete="tel"
              placeholder="0412 345 678"
              value={mobile}
              onChange={(e) => { setMobile(e.target.value); setError(''); }}
            />
          </div>
          <div className="ford-field">
            <label>Dealer</label>
            <div className="ford-dealer">{dealerName}</div>
          </div>
          <div className="ford-field">
            <label htmlFor="ford-vehicle">Purchased Vehicle</label>
            <select
              id="ford-vehicle"
              value={vehicle}
              onChange={(e) => { setVehicle(e.target.value); setError(''); }}
            >
              <option value="">Select</option>
              {vehicles.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="ford-field">
            <label htmlFor="ford-contract">Last 4 digits of sales contract</label>
            <input
              id="ford-contract"
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="0000"
              value={contractNumber}
              onChange={(e) => {
                setContractNumber(e.target.value.replace(/\D/g, '').slice(0, 4));
                setError('');
              }}
            />
          </div>

          <button
            className="ford-cta"
            type="button"
            onClick={handleVerifyAndEnter}
            disabled={otpSending}
          >
            <span>{otpSending ? 'Sending code…' : 'Verify & enter'}</span>
          </button>

          <p className="ford-legal">
            By continuing you agree to the Ford promotion terms. Outcomes are determined
            after mobile verification. Dealer — {dealerName}.
          </p>
        </div>
      )}

      {step === STEPS.OTP && (
        <div className="ford-form">
          <p className="ford-kicker">Ford · Go Further</p>
          <h1 className="ford-title">Verify your mobile</h1>
          <p className="ford-lede">Enter the code sent to {mobile}</p>

          {error && <div className="ford-error" role="alert">{error}</div>}
          {otpDemo && (
            <div className="ford-demo">Demo mode — enter <strong>123456</strong></div>
          )}

          <div className="ford-field">
            <label htmlFor="ford-otp">6-digit code</label>
            <input
              id="ford-otp"
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
            className="ford-cta"
            type="button"
            onClick={handleVerifyOtp}
            disabled={otpVerifying || otpCode.length !== 6}
          >
            <span>{otpVerifying ? 'Verifying…' : 'Confirm & reveal'}</span>
          </button>

          <button
            className="ford-ghost"
            type="button"
            onClick={() => { setStep(STEPS.FORM); setOtpCode(''); setError(''); }}
          >
            Change details
          </button>
        </div>
      )}

      {step === STEPS.SUBMITTING && (
        <div className="ford-form">
          <h1 className="ford-title">Revealing your voucher</h1>
          <p className="ford-lede">This only takes a moment.</p>
        </div>
      )}

      {step === STEPS.REVEAL && win && (
        <div className="ford-form">
          <div className="ford-result ford-result--win">
            <p className="ford-kicker">Ford Instant Win</p>
            <h1>Congratulations{first ? ` ${first}` : ''}!</h1>
            <p className="ford-lede ford-lede--emphasis">You&apos;ve won</p>
            <div className="ford-prize ford-prize--reveal">
              <FordVoucherCounter
                key={reveal?.claimId || 'voucher'}
                value={reveal?.prizeValue}
              />
              <p className="ford-voucher-label">
                {reveal?.prizeName || FORD_VOUCHER_NAME}
              </p>
            </div>
            <p className="ford-staff-msg">
              Redemption instructions have been sent to your mobile.
              Show that message and your reference to Ford staff.
            </p>
            {reveal?.redemptionCode ? (
              <div className="ford-ref">
                <span className="ford-ref__label">Reference number</span>
                <div className="ford-code">{reveal.redemptionCode}</div>
              </div>
            ) : (
              <p className="ford-lede">Your reference is being generated — check your SMS shortly.</p>
            )}
          </div>
        </div>
      )}
    </FordEntryShell>
  );
}
