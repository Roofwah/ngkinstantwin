import { useState } from 'react';
import { sendOtp, verifyOtp } from '../api';
import HokaCampaignShell from './HokaCampaignShell';
import HokaConfetti from './HokaConfetti';
import { HOKA_ITEMS, isHokaWin, hokaPrizeImage } from '../campaigns/hokaCotswold';

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
  "You're not an instant winner this time. You've been automatically entered into the sweepstakes prize draw.";

export default function HokaEntryForm({
  campaign,
  device,
  brands,
  labSessionId,
  onComplete,
}) {
  const items = brands?.length ? brands : HOKA_ITEMS;
  const storeName = device?.storeName || 'Cotswold Outdoor Birmingham';
  const artSrc = campaign?.config?.formArtUrl || '/campaigns/hoka/iwbg.jpg';
  const minSpend = Number(campaign?.config?.minSpend) || 50;
  const sweepstakes = campaign?.config?.demoControl?.sweepstakesMessage || DEFAULT_SWEEPSTAKES;

  const [step, setStep] = useState(STEPS.FORM);
  const [error, setError] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [postcode, setPostcode] = useState('');
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
    if (!/^\d{4}$/.test(postcode.trim())) {
      setError('Enter a 4-digit Australian postcode');
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
        postcode: postcode.trim(),
        selectedBrand: item,
        spendAmount: parseFloat(spend),
        productDescription: item,
        receiptSource: 'manual',
        verificationMethod: 'hoka_entry',
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

  const win = isHokaWin(reveal?.result);
  const first = normaliseName(fullName).split(/\s+/)[0];
  const isForm = step === STEPS.FORM;
  const revealArt = isForm ? artSrc : '/campaigns/hoka/verify.jpg';

  return (
    <HokaCampaignShell
      artSrc={revealArt}
      heroClassName={isForm ? 'hoka-hero--enter' : 'hoka-hero--enter hoka-hero--verify'}
    >
      <HokaConfetti active={step === STEPS.REVEAL && win} />
      {step === STEPS.FORM && (
        <div className="hoka-form-panel">
          <h1 className="hoka-title">Enter your details</h1>
          <p className="hoka-lede">
            Complete the form below to see if you win.
          </p>
          {error && <div className="hoka-error">{error}</div>}
          <div className="hoka-field">
            <label>Full Name</label>
            <input
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(''); }}
            />
          </div>
          <div className="hoka-field">
            <label>Mobile Number</label>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="0412 345 678"
              value={mobile}
              onChange={(e) => { setMobile(e.target.value); setError(''); }}
            />
          </div>
          <div className="hoka-field">
            <label>Postcode</label>
            <input
              type="text"
              autoComplete="postal-code"
              placeholder="3000"
              inputMode="numeric"
              maxLength={4}
              value={postcode}
              onChange={(e) => { setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
            />
          </div>
          <div className="hoka-field">
            <label>Store</label>
            <div className="hoka-store hoka-store--field">{storeName}</div>
          </div>
          <div className="hoka-field">
            <label>Item Purchased</label>
            <select value={item} onChange={(e) => { setItem(e.target.value); setError(''); }}>
              <option value="">Select</option>
              {items.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div className="hoka-field">
            <label>Purchase Value ($)</label>
            <div className="hoka-prefix">
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
          <button className="hoka-cta" type="button" onClick={handleVerifyAndEnter} disabled={otpSending}>
            {otpSending ? 'Sending code…' : 'Verify & Enter'}
          </button>
          <p className="hoka-legal">
            By continuing you agree to the promotion terms. Instant-win outcomes are determined
            server-side after your mobile is verified. Store is set from this PUK — {storeName}.
          </p>
        </div>
      )}

      {step === STEPS.OTP && (
        <div className="hoka-form-panel">
          <h1 className="hoka-title">Verify your number</h1>
          <p className="hoka-lede">Code sent to {mobile}</p>
          {error && <div className="hoka-error">{error}</div>}
          {otpDemo && (
            <div className="hoka-demo">Demo mode — enter <strong>123456</strong></div>
          )}
          <div className="hoka-field">
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
            className="hoka-cta"
            type="button"
            onClick={handleVerifyOtp}
            disabled={otpVerifying || otpCode.length !== 6}
          >
            {otpVerifying ? 'Verifying…' : 'Confirm'}
          </button>
          <button
            className="hoka-ghost"
            type="button"
            onClick={() => { setStep(STEPS.FORM); setOtpCode(''); setError(''); }}
          >
            Change details
          </button>
        </div>
      )}

      {step === STEPS.SUBMITTING && (
        <div className="hoka-form-panel">
          <h1 className="hoka-title">Checking your result</h1>
          <p className="hoka-lede">Hang tight — this only takes a moment.</p>
        </div>
      )}

      {step === STEPS.REVEAL && (
        <div className="hoka-form-panel">
          {win ? (
            <div className="hoka-result hoka-result--win">
              <h1>Congratulations{first ? ` ${first}` : ''}!</h1>
              <p className="hoka-lede" style={{ fontSize: '1.15rem', color: '#dfff00' }}>
                You’re an instant winner
              </p>
              <div className="hoka-prize hoka-prize--reveal">
                <span>You’ve won</span>
                {hokaPrizeImage(reveal?.prizeName) && (
                  <img
                    className="hoka-prize-art"
                    src={hokaPrizeImage(reveal.prizeName)}
                    alt={reveal.prizeName}
                  />
                )}
                <strong>{reveal?.prizeName || 'an instant prize'}</strong>
              </div>
              {reveal?.redemptionCode && (
                <div className="hoka-code">{reveal.redemptionCode}</div>
              )}
            </div>
          ) : (
            <>
              <div className="hoka-result">
                <h1>Not this time</h1>
                <p className="hoka-lede">{sweepstakes}</p>
                <div className="hoka-sweepstakes">Sweepstakes entry confirmed</div>
              </div>
              <a
                className="hoka-cta"
                href="https://www.cotswoldoutdoor.com/"
                target="_blank"
                rel="noreferrer"
              >
                Visit Cotswold Outdoor
              </a>
            </>
          )}
        </div>
      )}
    </HokaCampaignShell>
  );
}
