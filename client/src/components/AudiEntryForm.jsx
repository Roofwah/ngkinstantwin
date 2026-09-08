import { useState } from 'react';
import { sendOtp, verifyOtp } from '../api';
import AudiEntryShell from './AudiEntryShell';
import AudiConfetti from './AudiConfetti';
import AudiVoucherCounter from './AudiVoucherCounter';
import {
  AUDI_FORM_ART,
  AUDI_VERIFICATION_METHOD,
  AUDI_VOUCHER_NAME,
  audiDealerName,
  audiModels,
  isAudiWin,
  isValidAudiContractNumber,
} from '../campaigns/audi';

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

export default function AudiEntryForm({
  campaign,
  models: modelsProp,
  onComplete,
}) {
  const models = modelsProp?.length ? modelsProp : audiModels(campaign);
  const dealerName = audiDealerName(campaign);
  const artSrc = campaign?.config?.formArtUrl || AUDI_FORM_ART;

  const [step, setStep] = useState(STEPS.FORM);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [model, setModel] = useState('');
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
    if (!model) {
      setError('Select your model');
      return;
    }
    if (!isValidAudiContractNumber(contractNumber)) {
      setError('Enter the last 4 digits of your contract number');
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
        selectedBrand: model,
        spendAmount: 0,
        productDescription: model,
        receiptSource: 'manual',
        verificationMethod: AUDI_VERIFICATION_METHOD,
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

  const win = isAudiWin(reveal?.result);
  const first = normaliseName(fullName).split(/\s+/)[0];
  const shellPhase = step === STEPS.FORM ? 'form' : step === STEPS.OTP ? 'verify' : 'result';

  return (
    <AudiEntryShell artSrc={artSrc} phase={shellPhase}>
      <AudiConfetti active={step === STEPS.REVEAL && win} />
      {step === STEPS.FORM && (
        <div className="audi-form">
          <p className="audi-kicker">Audi Instant Win</p>
          <h1 className="audi-title">Enter your details</h1>
          <p className="audi-lede">Verify your mobile to check your instant win result.</p>
          {error && <div className="audi-error">{error}</div>}
          <div className="audi-field">
            <label htmlFor="audi-name">Full name</label>
            <input
              id="audi-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(''); }}
            />
          </div>
          <div className="audi-field">
            <label htmlFor="audi-mobile">Mobile number</label>
            <input
              id="audi-mobile"
              type="tel"
              autoComplete="tel"
              placeholder="0412 345 678"
              value={mobile}
              onChange={(e) => { setMobile(e.target.value); setError(''); }}
            />
          </div>
          <div className="audi-field">
            <label>Audi dealer</label>
            <div className="audi-dealer">{dealerName}</div>
          </div>
          <div className="audi-field">
            <label htmlFor="audi-model">Model</label>
            <select
              id="audi-model"
              value={model}
              onChange={(e) => { setModel(e.target.value); setError(''); }}
            >
              <option value="">Select</option>
              {models.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="audi-field">
            <label htmlFor="audi-contract">Last 4 digits of contract number</label>
            <input
              id="audi-contract"
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
          <button className="audi-cta" type="button" onClick={handleVerifyAndEnter} disabled={otpSending}>
            {otpSending ? 'Sending code…' : 'Verify & enter'}
          </button>
          <p className="audi-legal">
            By continuing you agree to the Audi Instant Win promotion terms. Outcomes are
            determined after mobile verification. Dealer is set from this device — {dealerName}.
          </p>
        </div>
      )}

      {step === STEPS.OTP && (
        <div className="audi-form">
          <p className="audi-kicker">Audi Instant Win</p>
          <h1 className="audi-title">Verify your mobile</h1>
          <p className="audi-lede">Enter the code sent to {mobile}</p>
          {error && <div className="audi-error">{error}</div>}
          {otpDemo && (
            <div className="audi-demo">Demo mode — enter <strong>123456</strong></div>
          )}
          <div className="audi-field">
            <label htmlFor="audi-otp">6-digit code</label>
            <input
              id="audi-otp"
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
            className="audi-cta"
            type="button"
            onClick={handleVerifyOtp}
            disabled={otpVerifying || otpCode.length !== 6}
          >
            {otpVerifying ? 'Verifying…' : 'Confirm & reveal'}
          </button>
          <button
            className="audi-ghost"
            type="button"
            onClick={() => { setStep(STEPS.FORM); setOtpCode(''); setError(''); }}
          >
            Change details
          </button>
        </div>
      )}

      {step === STEPS.SUBMITTING && (
        <div className="audi-form audi-form--plain">
          <h1 className="audi-title">Revealing your voucher</h1>
          <p className="audi-lede">This only takes a moment.</p>
        </div>
      )}

      {step === STEPS.REVEAL && win && (
        <div className="audi-form audi-form--plain">
          <div className="audi-result audi-result--win">
            <p className="audi-kicker">Audi Instant Win</p>
            <h1>Congratulations{first ? ` ${first}` : ''}!</h1>
            <p className="audi-lede audi-lede--emphasis">You&apos;ve won</p>
            <div className="audi-prize audi-prize--reveal">
              <AudiVoucherCounter value={reveal?.prizeValue} />
              <strong className="audi-voucher-label">
                {reveal?.prizeName || AUDI_VOUCHER_NAME}
              </strong>
            </div>
            <p className="audi-lede audi-lede--win-notify">
              Redemption instructions have been sent to your mobile.
              Show that message and your reference to Audi staff.
            </p>
            {reveal?.redemptionCode ? (
              <div className="audi-ref">
                <span className="audi-ref__label">Reference number</span>
                <div className="audi-code">{reveal.redemptionCode}</div>
              </div>
            ) : (
              <p className="audi-lede">Your reference is being generated — check your SMS shortly.</p>
            )}
          </div>
        </div>
      )}
    </AudiEntryShell>
  );
}
