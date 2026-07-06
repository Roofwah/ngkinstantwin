import { useRef, useState } from 'react';
import { deriveStoreCodeFromInvoice, parseReceiptFile } from '../lib/receiptParse';

const EMPTY = {
  invoiceNumber: '',
  storeName: '',
  purchaseDate: '',
  purchaseDateDisplay: '',
  purchaseTime: '',
  productDescription: '',
  selectedBrand: '',
  spendAmount: '',
};

function ReadoutRow({ label, value }) {
  return (
    <div className="receipt-readout__row">
      <span className="receipt-readout__label">{label}</span>
      <span className="receipt-readout__value">{value}</span>
    </div>
  );
}

function FieldIssue({ issue }) {
  if (!issue) return null;
  return (
    <div className="receipt-readout__issue">
      <strong>Couldn&apos;t read {issue.label}</strong>
      <p>{issue.reason}</p>
    </div>
  );
}

/**
 * Receipt capture after OTP — camera, gallery, PDF, or manual fallback.
 */
export default function ReceiptCaptureStep({ brands, onSubmit, onBack, submitting }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const pdfRef = useRef(null);

  const [mode, setMode] = useState('upload');
  const [receiptSource, setReceiptSource] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileName, setFileName] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [readFlags, setReadFlags] = useState({});
  const [readIssues, setReadIssues] = useState([]);
  const [spendNote, setSpendNote] = useState('');
  const [invoiceTotal, setInvoiceTotal] = useState(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  const issueMap = Object.fromEntries(
    readIssues.map(i => [i.field, { ...i, label: fieldLabel(i.field) }])
  );

  function fieldLabel(field) {
    const labels = {
      invoiceNumber: 'invoice number',
      storeName: 'store',
      purchaseDate: 'date',
      purchaseTime: 'time',
      spendAmount: 'eligible purchase amount',
    };
    return labels[field] || field;
  }

  function applyParsedFields(parsed) {
    setReadFlags(parsed.read || {});
    setReadIssues(parsed.issues || []);
    setInvoiceTotal(parsed.invoiceTotal || null);

    let note = '';
    if (parsed.spendConfidence === 'brand_line') {
      note = 'Eligible brand line item(s) detected on the receipt.';
    } else if (parsed.spendConfidence === 'single_line') {
      note = 'One product line was read — confirm the amount is for qualifying NGK, NTK or KYB products (not other items on the receipt).';
    } else if (!parsed.spendAmount && parsed.invoiceTotal) {
      note = `Invoice total $${parsed.invoiceTotal} was read, but qualifying product lines could not be matched. Enter the amount spent on NGK, NTK or KYB products.`;
    }
    setSpendNote(note);

    setForm({
      invoiceNumber: parsed.invoiceNumber || '',
      storeName: parsed.storeName || '',
      purchaseDate: parsed.purchaseDate || '',
      purchaseDateDisplay: parsed.purchaseDateDisplay || '',
      purchaseTime: parsed.purchaseTime || '',
      productDescription: parsed.productDescription || '',
      selectedBrand: parsed.detectedBrand || '',
      spendAmount: parsed.spendAmount || '',
    });
  }

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setError('');
  }

  async function runParse(file) {
    setScanning(true);
    try {
      const parsed = await parseReceiptFile(file, brands);
      applyParsedFields(parsed);
    } catch {
      setReadFlags({});
      setReadIssues([{
        field: 'invoiceNumber',
        reason: 'The image could not be processed. Try better lighting, lay the receipt flat, and include the full header.',
      }]);
    } finally {
      setScanning(false);
    }
  }

  function handleFile(file, source) {
    if (!file) return;
    setReceiptFile(file);
    setReceiptSource(source);
    setFileName(file.name);
    setMode('upload');
    setError('');
    setReadFlags({});
    setReadIssues([]);
    setSpendNote('');
    setInvoiceTotal(null);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => {
        setFilePreview(e.target.result);
        runParse(file);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setFilePreview(null);
      runParse(file);
    } else {
      setFilePreview(null);
    }
  }

  function clearFile() {
    setReceiptFile(null);
    setReceiptSource(null);
    setFilePreview(null);
    setFileName('');
    setReadFlags({});
    setReadIssues([]);
    setSpendNote('');
    setInvoiceTotal(null);
    setForm(EMPTY);
  }

  function switchToManual() {
    setMode('manual');
    setReceiptSource('manual');
    clearFile();
    setError('');
  }

  function switchToUpload() {
    setMode('upload');
    setReceiptSource(null);
    setError('');
  }

  function validate() {
    const invoiceDigits = form.invoiceNumber.replace(/\D/g, '');
    if (!/^\d{10}$/.test(invoiceDigits)) {
      return 'Invoice number must be exactly 10 digits';
    }
    if (!form.purchaseDate && !form.purchaseDateDisplay) {
      return 'Purchase date is required';
    }
    if (!form.selectedBrand) {
      return 'Please select the brand purchased';
    }
    const spend = parseFloat(form.spendAmount);
    if (!spend || spend <= 0) {
      return 'Please enter the amount spent on qualifying products';
    }
    if (mode === 'manual' && !form.productDescription.trim()) {
      return 'Product description is required for manual entry';
    }
    if (mode === 'upload' && !receiptFile) {
      return 'Please take or upload a receipt photo or PDF';
    }
    return null;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const invoiceNumber = form.invoiceNumber.replace(/\D/g, '');
    const source = mode === 'manual' ? 'manual' : receiptSource;

    onSubmit({
      invoiceNumber,
      purchaseDate: form.purchaseDate || form.purchaseDateDisplay,
      purchaseTime: form.purchaseTime || null,
      storeName: form.storeName || null,
      storeCode: deriveStoreCodeFromInvoice(invoiceNumber),
      productDescription: form.productDescription.trim(),
      selectedBrand: form.selectedBrand,
      spendAmount: parseFloat(form.spendAmount),
      receiptSource: source,
      verificationMethod: source === 'manual' ? 'manual' : 'auto_pending',
      receiptFile: mode === 'manual' ? null : receiptFile,
    });
  }

  const dateTimeDisplay = [form.purchaseDateDisplay, form.purchaseTime].filter(Boolean).join(' · ');
  const hasReadSummary = mode === 'upload' && receiptFile && !scanning && Object.values(readFlags).some(Boolean);

  return (
    <form className="card campaign-shell__card" onSubmit={handleSubmit}>
      <h2 className="enter-form__title">Receipt Capture</h2>
      <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: 16, lineHeight: 1.45 }}>
        {mode === 'manual'
          ? 'Enter your receipt details manually. This entry will require verification before any prize is fulfilled.'
          : 'Photograph the full receipt header and product lines. We\'ll read what we can — you only need to fill in what\'s missing.'}
      </p>

      {error && <div className="alert alert--error" style={{ marginBottom: 14 }}>{error}</div>}
      {scanning && (
        <div className="receipt-readout__scanning">
          <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
          Reading receipt…
        </div>
      )}

      {mode === 'upload' && (
        <>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0], 'camera')} />
          <input ref={galleryRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0], 'gallery')} />
          <input ref={pdfRef} type="file" accept="application/pdf" style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0], 'pdf')} />

          {!receiptFile ? (
            <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
              <button type="button" className="btn btn--primary btn--full" onClick={() => cameraRef.current?.click()}>
                Take Photo of Receipt
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button type="button" className="btn btn--ghost btn--full" onClick={() => galleryRef.current?.click()}>
                  Upload Photo
                </button>
                <button type="button" className="btn btn--ghost btn--full" onClick={() => pdfRef.current?.click()}>
                  Upload PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="upload-preview" style={{ marginBottom: 16 }}>
              {filePreview ? (
                <img src={filePreview} alt="Receipt preview" />
              ) : (
                <div style={{ padding: '20px', background: 'var(--bg-3)' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>{fileName}</span>
                </div>
              )}
              <button type="button" className="upload-preview__clear" onClick={clearFile} title="Remove file">✕</button>
            </div>
          )}
        </>
      )}

      {hasReadSummary && (
        <div className="receipt-readout">
          <p className="receipt-readout__title">Read from receipt</p>
          {readFlags.invoiceNumber && <ReadoutRow label="Invoice number" value={form.invoiceNumber} />}
          {readFlags.storeName && <ReadoutRow label="Store" value={form.storeName} />}
          {(readFlags.purchaseDate || readFlags.purchaseTime) && (
            <ReadoutRow label="Date" value={dateTimeDisplay} />
          )}
          {readFlags.spendAmount && (
            <ReadoutRow label="Amount (line item)" value={`$${form.spendAmount}`} />
          )}
          {invoiceTotal && !readFlags.spendAmount && (
            <ReadoutRow label="Invoice total" value={`$${invoiceTotal}`} />
          )}
        </div>
      )}

      {!readFlags.invoiceNumber && (mode === 'manual' || receiptFile) && (
        <div className="field">
          <label>Invoice Number *</label>
          <input type="text" inputMode="numeric" maxLength={10} placeholder="10-digit invoice number"
            value={form.invoiceNumber}
            onChange={e => setField('invoiceNumber', e.target.value.replace(/\D/g, '').slice(0, 10))} />
          <FieldIssue issue={issueMap.invoiceNumber} />
        </div>
      )}

      {!readFlags.storeName && (mode === 'manual' || receiptFile) && (
        <div className="field">
          <label>Store *</label>
          <input type="text" placeholder="e.g. Maroochydore" value={form.storeName}
            onChange={e => setField('storeName', e.target.value)} />
          <FieldIssue issue={issueMap.storeName} />
        </div>
      )}

      {(!readFlags.purchaseDate || !readFlags.purchaseTime) && (mode === 'manual' || receiptFile) && (
        <div className="field">
          <label>Date &amp; time *</label>
          {!readFlags.purchaseDate && (
            <input type="date" value={form.purchaseDate}
              onChange={e => setField('purchaseDate', e.target.value)} style={{ marginBottom: 8 }} />
          )}
          {!readFlags.purchaseTime && (
            <input type="time" value={form.purchaseTime}
              onChange={e => setField('purchaseTime', e.target.value)} />
          )}
          <FieldIssue issue={issueMap.purchaseDate || issueMap.purchaseTime} />
        </div>
      )}

      {mode === 'manual' && (
        <div className="field">
          <label>Product Description *</label>
          <input type="text" placeholder="e.g. NGK spark plugs" value={form.productDescription}
            onChange={e => setField('productDescription', e.target.value)} />
        </div>
      )}

      <div className="field">
        <label>Brand Purchased *</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          {brands.map(b => (
            <button key={b} type="button" onClick={() => setField('selectedBrand', b)}
              className={form.selectedBrand === b ? 'btn btn--primary' : 'btn btn--ghost'}
              style={{ flex: '1 1 80px' }}>
              {b}
            </button>
          ))}
        </div>
      </div>

      {(!readFlags.spendAmount || mode === 'manual') && (
        <div className="field">
          <label>Amount — qualifying products ($) *</label>
          {spendNote && <p className="field-hint" style={{ marginBottom: 8 }}>{spendNote}</p>}
          <input type="number" inputMode="decimal" placeholder="0.00" min="0" step="0.01"
            value={form.spendAmount} onChange={e => setField('spendAmount', e.target.value)} />
          <FieldIssue issue={issueMap.spendAmount} />
        </div>
      )}

      {mode === 'upload' ? (
        <button type="button" className="btn btn--ghost btn--full" style={{ marginBottom: 12, fontSize: '0.85rem' }} onClick={switchToManual}>
          Enter everything manually
        </button>
      ) : (
        <button type="button" className="btn btn--ghost btn--full" style={{ marginBottom: 12, fontSize: '0.85rem' }} onClick={switchToUpload}>
          Back to photo / upload
        </button>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" className="btn btn--ghost" onClick={onBack} disabled={submitting}>Back</button>
        <button type="submit" className="btn btn--primary" style={{ flex: 1 }} disabled={submitting || scanning}>
          {submitting
            ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Submitting...</>
            : 'Continue to Scratch →'}
        </button>
      </div>
    </form>
  );
}
