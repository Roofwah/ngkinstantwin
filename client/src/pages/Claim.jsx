import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitClaim, sendOtp, verifyOtp } from '../api';
import BarcodeScanner from '../components/BarcodeScanner';
import { BrowserMultiFormatReader } from '@zxing/browser';

const BRANDS = ['NGK', 'NTK', 'KYB'];

export default function Claim() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpDemo, setOtpDemo] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [fileName, setFileName] = useState('');
  const [barcodeScanning, setBarcodeScanning] = useState(false);

  const [form, setForm] = useState({
    mobile: '',
    receiptNumber: '',
    spendAmount: '',
    selectedBrand: '',
    termsAccepted: false,
    receipt: null,
  });

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }

  async function detectBarcodeFromImage(dataURL) {
    const img = new Image();
    img.src = dataURL;
    await img.decode();

    // Try native BarcodeDetector first (Chrome/Android)
    if (window.BarcodeDetector) {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        const want = ['code_128', 'code_39', 'ean_13', 'ean_8', 'itf', 'upc_a', 'upc_e'];
        const formats = want.filter(f => supported.includes(f));
        if (formats.length > 0) {
          const detector = new window.BarcodeDetector({ formats });
          const results = await detector.detect(img);
          if (results.length > 0) return results[0].rawValue;
        }
      } catch { /* fall through to zxing */ }
    }

    // Fallback: zxing (works on iOS Safari + all browsers)
    try {
      const el = document.createElement('img');
      el.src = dataURL;
      el.style.cssText = 'position:fixed;opacity:0;pointer-events:none;top:0;left:0';
      document.body.appendChild(el);
      await new Promise(r => { el.onload = r; el.onerror = r; });
      try {
        const reader = new BrowserMultiFormatReader();
        const result = await reader.decodeFromImageElement(el);
        return result.getText();
      } finally {
        document.body.removeChild(el);
      }
    } catch { /* no barcode found */ }

    return null;
  }

  function extractNumberFromFilename(filename) {
    // Strip extension, keep only digits — if result is 6+ digits it's likely an invoice number
    const base = filename.replace(/\.[^.]+$/, '');
    const digits = base.replace(/\D/g, '');
    return digits.length >= 6 ? digits : null;
  }

  function handleFile(file) {
    if (!file) return;
    set('receipt', file);
    setFileName(file.name);
    if (file.type.startsWith('image/')) {
      const fileReader = new FileReader();
      fileReader.onload = async e => {
        setFilePreview(e.target.result);
        setBarcodeScanning(true);
        const barcode = await detectBarcodeFromImage(e.target.result);
        setBarcodeScanning(false);
        if (barcode) {
          setForm(f => ({ ...f, receiptNumber: f.receiptNumber || barcode }));
        } else {
          // Fallback: try filename
          const fromName = extractNumberFromFilename(file.name);
          if (fromName) setForm(f => ({ ...f, receiptNumber: f.receiptNumber || fromName }));
        }
      };
      fileReader.readAsDataURL(file);
    } else {
      setFilePreview(null);
      // PDF / non-image: extract invoice number from filename
      const fromName = extractNumberFromFilename(file.name);
      if (fromName) setForm(f => ({ ...f, receiptNumber: f.receiptNumber || fromName }));
    }
  }

  function normaliseMobile(raw) {
    // Accept: 04XX XXX XXX  |  +61 4XX XXX XXX  |  +614XXXXXXXX
    const stripped = raw.replace(/[\s\-()]/g, '');
    if (/^\+614/.test(stripped)) return '0' + stripped.slice(3); // +614… → 04…
    return stripped;
  }

  async function handleSendOtp() {
    const mobile = normaliseMobile(form.mobile);
    if (!/^04\d{8}$/.test(mobile)) {
      setError('Enter a valid Australian mobile (04XX XXX XXX or +61 4XX XXX XXX)');
      return;
    }
    setError('');
    setOtpSending(true);
    try {
      const res = await sendOtp(mobile);
      setOtpSent(true);
      setOtpDemo(res.demo);
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOtp() {
    if (!otpCode || otpCode.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setError('');
    setOtpVerifying(true);
    try {
      await verifyOtp(normaliseMobile(form.mobile), otpCode);
      setOtpVerified(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setOtpVerifying(false);
    }
  }

  function validateStep1() {
    if (!otpVerified) {
      setError('Please verify your mobile number first');
      return false;
    }
    if (!form.receiptNumber.trim()) {
      setError('Receipt / transaction number is required');
      return false;
    }
    if (!form.receipt) {
      setError('Please upload your receipt image or PDF');
      return false;
    }
    return true;
  }

  function validateStep2() {
    const spend = parseFloat(form.spendAmount);
    if (!spend || spend < 50) {
      setError('Minimum eligible spend is $50.00');
      return false;
    }
    if (!BRANDS.includes(form.selectedBrand)) {
      setError('Please select an eligible brand');
      return false;
    }
    if (!form.termsAccepted) {
      setError('You must accept the Terms & Conditions');
      return false;
    }
    return true;
  }

  function nextStep() {
    setError('');
    if (step === 1 && !validateStep1()) return;
    setStep(s => s + 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!validateStep2()) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('mobile', normaliseMobile(form.mobile));
      fd.append('receiptNumber', form.receiptNumber.trim());
      fd.append('spendAmount', form.spendAmount);
      fd.append('selectedBrand', form.selectedBrand);
      fd.append('termsAccepted', 'true');
      fd.append('receipt', form.receipt);

      const { claimId } = await submitClaim(fd);
      navigate(`/scratch/${claimId}`);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const stepLabels = ['Your Details', 'Purchase Info', 'Submit'];

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="topbar" style={{ justifyContent: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: '0.08em' }}>POWERED BY PURERANDOM™</span>
      </header>

      <main style={{ flex: 1, padding: '32px 16px' }}>
        <div className="container">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, marginBottom: 24, letterSpacing: '0.02em' }}>
            Submit Your Claim
          </h1>

          {/* Step indicator */}
          <div className="steps">
            {stepLabels.map((label, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              return (
                <div key={n} className={`step ${active ? 'step--active' : ''} ${done ? 'step--done' : ''}`}>
                  <div className="step__dot">{done ? '✓' : n}</div>
                  <span className="step__label">{label}</span>
                </div>
              );
            })}
          </div>

          {error && <div className="alert alert--error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Contact + Receipt */}
            {step === 1 && (
              <div className="card">
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Your Details &amp; Receipt
                </h2>

                <div className="field">
                  <label>Mobile Number *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="tel"
                      value={form.mobile}
                      onChange={e => { set('mobile', e.target.value); setOtpSent(false); setOtpVerified(false); setOtpCode(''); }}
                      placeholder="0412 345 678"
                      autoComplete="tel"
                      disabled={otpVerified}
                      style={{ flex: 1 }}
                    />
                    {!otpVerified && (
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={{ whiteSpace: 'nowrap', padding: '0 14px', fontSize: '0.82rem' }}
                        onClick={handleSendOtp}
                        disabled={otpSending}
                      >
                        {otpSending ? <span className="spinner" style={{ width: 14, height: 14 }} /> : otpSent ? 'Resend' : 'Send Code'}
                      </button>
                    )}
                    {otpVerified && (
                      <span style={{ display: 'flex', alignItems: 'center', color: '#00c853', fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                        Verified
                      </span>
                    )}
                  </div>

                  {/* OTP input — shown after code is sent */}
                  {otpSent && !otpVerified && (
                    <div style={{ marginTop: 10 }}>
                      {otpDemo && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--amber)', marginBottom: 6, padding: '6px 10px', background: 'rgba(255,171,0,0.08)', borderRadius: 4 }}>
                          Demo mode — enter <strong>123456</strong> to verify
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={otpCode}
                          onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                          placeholder="6-digit code"
                          style={{ flex: 1, letterSpacing: '0.2em', fontSize: '1.1rem', textAlign: 'center' }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn btn--primary"
                          style={{ whiteSpace: 'nowrap', padding: '0 14px' }}
                          onClick={handleVerifyOtp}
                          disabled={otpVerifying || otpCode.length !== 6}
                        >
                          {otpVerifying ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Verify'}
                        </button>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 4 }}>
                        Code sent to {form.mobile} · expires in 10 min
                      </div>
                    </div>
                  )}
                </div>

                <div className="field">
                  <label>Receipt / Transaction Number *</label>
                  <input
                    type="text"
                    value={form.receiptNumber}
                    onChange={e => set('receiptNumber', e.target.value)}
                    placeholder="e.g. 3420958459"
                  />
                  {barcodeScanning
                    ? <span style={{ fontSize: '0.75rem', color: 'var(--amber)' }}>⏳ Reading barcode…</span>
                    : <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Auto-filled when you scan your invoice below</span>
                  }
                </div>

                <div className="field">
                  <label>Receipt *</label>
                  {!form.receipt ? (
                    <>
                      {/* Hidden inputs */}
                      <input
                        ref={cameraRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        style={{ display: 'none' }}
                        onChange={e => handleFile(e.target.files[0])}
                      />
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        onChange={e => handleFile(e.target.files[0])}
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <button
                          type="button"
                          className="btn btn--ghost btn--full"
                          style={{ padding: '18px 10px', flexDirection: 'column', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
                          onClick={() => cameraRef.current?.click()}
                        >
                          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>&#128247;</span>
                          Scan Invoice
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--full"
                          style={{ padding: '18px 10px', flexDirection: 'column', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
                          onClick={() => fileRef.current?.click()}
                        >
                          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>&#128196;</span>
                          Upload Invoice
                        </button>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 6 }}>
                        Scan: point camera at invoice — fills number automatically · Upload: PDF or image from email / files
                      </div>
                    </>
                  ) : (
                    <div className="upload-preview">
                      {filePreview ? (
                        <img src={filePreview} alt="Receipt preview" />
                      ) : (
                        <div style={{ padding: '20px', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>{fileName}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        className="upload-preview__clear"
                        onClick={() => { set('receipt', null); setFilePreview(null); setFileName(''); }}
                        title="Remove file"
                      >✕</button>
                    </div>
                  )}
                </div>

                {/* PRODUCTION NOTE: Receipt OCR / verification would integrate here
                    to auto-extract transaction ID, date, total, and brand from the uploaded image */}

                <button type="button" className="btn btn--primary btn--full" onClick={nextStep}>
                  Continue →
                </button>
              </div>
            )}

            {/* Step 2: Purchase details */}
            {step === 2 && (
              <div className="card">
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Purchase Details
                </h2>

                <div className="field">
                  <label>Total Spend Amount ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.spendAmount}
                    onChange={e => set('spendAmount', e.target.value)}
                    placeholder="50.00"
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    Minimum eligible spend: $50.00
                  </span>
                </div>

                <div className="field">
                  <label>Eligible Brand Purchased *</label>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
                    {BRANDS.map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => set('selectedBrand', b)}
                        style={{
                          padding: 0, border: '2px solid',
                          borderColor: form.selectedBrand === b ? 'var(--green)' : 'var(--border)',
                          borderRadius: 6, background: 'none', cursor: 'pointer',
                          boxShadow: form.selectedBrand === b ? '0 0 10px var(--green-glow)' : 'none',
                          outline: 'none',
                        }}
                      >
                        <img src={`/logos/${b.toLowerCase()}.svg`} alt={b} style={{ height: 40, display: 'block', borderRadius: 4 }} />
                      </button>
                    ))}
                  </div>
                  {!form.selectedBrand && <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Select a brand above</span>}
                </div>

                {/* Summary card */}
                <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px', marginBottom: 20, fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>Claim Summary</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ color: 'var(--text-3)' }}>Mobile</div>
                    <div>{form.mobile || '—'}</div>
                    <div style={{ color: 'var(--text-3)' }}>Receipt #</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{form.receiptNumber || '—'}</div>
                    <div style={{ color: 'var(--text-3)' }}>File</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName || '—'}</div>
                  </div>
                </div>

                {/* T&Cs */}
                <div className="checkbox-row">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={form.termsAccepted}
                    onChange={e => set('termsAccepted', e.target.checked)}
                  />
                  <label htmlFor="terms">
                    I confirm my purchase meets the eligibility criteria and I agree to the{' '}
                    <span style={{ color: 'var(--green)', textDecoration: 'underline', cursor: 'pointer' }}>Terms &amp; Conditions</span>.
                    I understand Tier 2 and Tier 3 prizes are provisional and subject to validation.
                  </label>
                </div>

                <div className="compliance-note">
                  Instant win outcomes are determined by a secure server-side prize manifest prior to reveal.
                  Non-winning eligible claims may be entered into a later prize draw if configured.
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button type="button" className="btn btn--ghost" onClick={() => setStep(1)}>← Back</button>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    style={{ flex: 1 }}
                    disabled={submitting}
                  >
                    {submitting ? <><span className="spinner" /> Submitting…</> : 'Submit Claim →'}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* PRODUCTION NOTE: SMS OTP verification of mobile number would integrate here */}
        </div>
      </main>

      {showScanner && (
        <BarcodeScanner
          onScan={value => { set('receiptNumber', value); setShowScanner(false); }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
