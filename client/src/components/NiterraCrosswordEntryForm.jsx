import { useState } from 'react';
import { sendOtp, verifyOtp } from '../api';
import NiterraCrosswordShell from './NiterraCrosswordShell';
import HokaConfetti from './HokaConfetti';
import {
  NITERRA_BRANDS,
  NITERRA_DEFAULT_STORE,
  isNiterraWin,
  niterraPrizeImage,
} from '../campaigns/niterraRepco';

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

const DEFAULT_SWEEPSTAKES =
  "You're not an instant winner this time. You've been automatically entered into the weekly prize draw.";

export default function NiterraCrosswordEntryForm({
  campaign,
  device,
  brands,
  onComplete,
}) {
  const items = brands?.length ? brands : NITERRA_BRANDS;
  const storeName = device?.storeName || NITERRA_DEFAULT_STORE;
  const artSrc = campaign?.config?.formArtUrl || '/campaigns/niterra/iwbg.png';
  const minSpend = Number(campaign?.config?.minSpend) || 50;
  const sweepstakes = campaign?.config?.demoControl?.sweepstakesMessage || DEFAULT_SWEEPSTAKES;

  const [step, setStep] = useState(STEPS.FORM);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [item, setItem] = useState('');
  const [spend, setSpend] = useState('');
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
    if (!item) {
      setError('Select the item purchased');
      return;
    }
    const value = parseFloat(spend);
    if (!value || value < minSpend) {
      setError(`Minimum qualifying purchase is $${minSpend.toFixed(2)}`);
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
        selectedBrand: item,
        spendAmount: parseFloat(spend),
        productDescription: item,
        receiptSource: 'manual',
        verificationMethod: 'niterra_crossword',
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

  const win = isNiterraWin(reveal?.result);
  const first = normaliseName(fullName).split(/\s+/)[0];
  const isForm = step === STEPS.FORM;

  return (
    <NiterraCrosswordShell
      artSrc={artSrc}
      heroClassName={isForm ? 'ngk-hero--enter' : 'ngk-hero--enter ngk-hero--verify'}
    >
      <HokaConfetti active={step === STEPS.REVEAL && win} />
      {step === STEPS.FORM && (
        <div className="ngk-form-panel">
          <h1 className="ngk-title">Enter your details</h1>
          <p className="ngk-lede">
            Complete the form below to see if you win.
          </p>
          {error && <div className="ngk-error">{error}</div>}
          <div className="ngk-field">
            <label>Full Name</label>
            <input
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(''); }}
            />
          </div>
          <div className="ngk-field">
            <label>Mobile Number</label>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="0412 345 678"
              value={mobile}
              onChange={(e) => { setMobile(e.target.value); setError(''); }}
            />
          </div>
          <div className="ngk-field">
            <label>Store</label>
            <div className="ngk-store ngk-store--field">{storeName}</div>
          </div>
          <div className="ngk-field">
            <label>Item Purchased</label>
            <select value={item} onChange={(e) => { setItem(e.target.value); setError(''); }}>
              <option value="">Select</option>
              {items.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="ngk-field">
            <label>Purchase Value ($)</label>
            <div className="ngk-prefix">
              <span>$</span>
              <input
                type="number"
                min={minSpend}
                step="0.01"
                inputMode="decimal"
                placeholder={`${minSpend}.00`}
                value={spend}
                onChange={(e) => { setSpend(e.target.value); setError(''); }}
              />
            </div>
          </div>
          <button className="ngk-cta" type="button" onClick={handleVerifyAndEnter} disabled={otpSending}>
            {otpSending ? 'Sending code…' : 'Verify & Enter'}
          </button>
          <p className="ngk-legal">
            By continuing you agree to the promotion terms. Instant-win outcomes are determined
            server-side after your mobile is verified. Store is set from this PUK — {storeName}.
          </p>
        </div>
      )}

      {step === STEPS.OTP && (
        <div className="ngk-form-panel">
          <h1 className="ngk-title">Verify your number</h1>
          <p className="ngk-lede">Code sent to {mobile}</p>
          {error && <div className="ngk-error">{error}</div>}
          {otpDemo && (
            <div className="ngk-demo">Demo mode — enter <strong>123456</strong></div>
          )}
          <div className="ngk-field">
            <label>6-digit code</label>
            <input
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
            className="ngk-cta"
            type="button"
            onClick={handleVerifyOtp}
            disabled={otpVerifying || otpCode.length !== 6}
          >
            {otpVerifying ? 'Verifying…' : 'Confirm'}
          </button>
          <button
            className="ngk-ghost"
            type="button"
            onClick={() => { setStep(STEPS.FORM); setOtpCode(''); setError(''); }}
          >
            Change details
          </button>
        </div>
      )}

      {step === STEPS.SUBMITTING && (
        <div className="ngk-form-panel">
          <h1 className="ngk-title">Checking your result</h1>
          <p className="ngk-lede">Hang tight — this only takes a moment.</p>
        </div>
      )}

      {step === STEPS.REVEAL && (
        <div className="ngk-form-panel">
          {win ? (
            <div className="ngk-result ngk-result--win">
              <h1>Congratulations{first ? ` ${first}` : ''}!</h1>
              <p className="ngk-lede" style={{ fontSize: '1.15rem' }}>
                You’re an instant winner
              </p>
              <div className="ngk-prize ngk-prize--reveal">
                <span>You’ve won</span>
                {niterraPrizeImage(reveal?.prizeName) && (
                  <img
                    className="ngk-prize-art"
                    src={niterraPrizeImage(reveal.prizeName)}
                    alt={reveal.prizeName}
                  />
                )}
                <strong>{reveal?.prizeName || 'an instant prize'}</strong>
              </div>
              <p className="ngk-lede ngk-lede--win-notify">
                We’ve sent your redemption instructions to your mobile.
                Show that message — and this reference — to a staff member.
              </p>
              {reveal?.redemptionCode ? (
                <div className="ngk-ref">
                  <span className="ngk-ref__label">Reference number</span>
                  <div className="ngk-code">{reveal.redemptionCode}</div>
                </div>
              ) : (
                <p className="ngk-lede">Your reference is being generated — check your SMS shortly.</p>
              )}
            </div>
          ) : (
            <>
              <div className="ngk-result">
                <h1>Not this time</h1>
                <p className="ngk-lede">{sweepstakes}</p>
                <div className="ngk-sweepstakes">Weekly draw entry confirmed</div>
              </div>
              <a
                className="ngk-cta"
                href="https://www.repco.com.au/"
                target="_blank"
                rel="noreferrer"
              >
                Visit Repco
              </a>
            </>
          )}
        </div>
      )}
    </NiterraCrosswordShell>
  );
}
