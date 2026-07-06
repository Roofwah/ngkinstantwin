import { useRef, useState } from 'react';

function deriveStoreCode(invoiceNumber) {
  const digits = String(invoiceNumber || '').replace(/\D/g, '');
  return digits.length >= 3 ? digits.slice(0, 3) : '';
}

const EMPTY = {
  invoiceNumber: '',
  purchaseDate: '',
  storeCode: '',
  productDescription: '',
  selectedBrand: '',
  spendAmount: '',
};

/**
 * Receipt capture after OTP — camera, gallery, PDF, or manual fallback.
 */
export default function ReceiptCaptureStep({ brands, onSubmit, onBack, submitting }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const pdfRef = useRef(null);

  const [mode, setMode] = useState('upload'); // upload | manual
  const [receiptSource, setReceiptSource] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileName, setFileName] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  function setField(field, value) {
    setForm(f => {
      const next = { ...f, [field]: value };
      if (field === 'invoiceNumber') {
        next.storeCode = deriveStoreCode(value);
      }
      return next;
    });
    setError('');
  }

  function handleFile(file, source) {
    if (!file) return;
    setReceiptFile(file);
    setReceiptSource(source);
    setFileName(file.name);
    setMode('upload');
    setError('');

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  }

  function clearFile() {
    setReceiptFile(null);
    setReceiptSource(null);
    setFilePreview(null);
    setFileName('');
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
    if (!form.purchaseDate) {
      return 'Purchase date is required';
    }
    if (!form.selectedBrand) {
      return 'Please select a brand';
    }
    const spend = parseFloat(form.spendAmount);
    if (!spend || spend <= 0) {
      return 'Please enter a valid purchase amount';
    }
    if (mode === 'manual') {
      if (!form.productDescription.trim()) {
        return 'Product description is required for manual entry';
      }
    } else if (!receiptFile) {
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
      purchaseDate: form.purchaseDate,
      storeCode: deriveStoreCode(invoiceNumber),
      productDescription: form.productDescription.trim(),
      selectedBrand: form.selectedBrand,
      spendAmount: parseFloat(form.spendAmount),
      receiptSource: source,
      verificationMethod: source === 'manual' ? 'manual' : 'auto_pending',
      receiptFile: mode === 'manual' ? null : receiptFile,
    });
  }

  const cardClass = 'card campaign-shell__card';

  return (
    <form className={cardClass} onSubmit={handleSubmit}>
      <h2 className="enter-form__title">Receipt Capture</h2>
      <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: 16, lineHeight: 1.45 }}>
        {mode === 'manual'
          ? 'Enter your receipt details manually. This entry will require verification before any prize is fulfilled.'
          : 'Take a photo or upload your receipt, then confirm the invoice details below.'}
      </p>

      {error && <div className="alert alert--error" style={{ marginBottom: 14 }}>{error}</div>}

      {mode === 'upload' && (
        <>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0], 'camera')}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0], 'gallery')}
          />
          <input
            ref={pdfRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0], 'pdf')}
          />

          {!receiptFile ? (
            <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                className="btn btn--primary btn--full"
                onClick={() => cameraRef.current?.click()}
              >
                Take Photo of Receipt
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn--ghost btn--full"
                  onClick={() => galleryRef.current?.click()}
                >
                  Upload Photo
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--full"
                  onClick={() => pdfRef.current?.click()}
                >
                  Upload PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="upload-preview" style={{ marginBottom: 16 }}>
              {filePreview ? (
                <img src={filePreview} alt="Receipt preview" />
              ) : (
                <div style={{ padding: '20px', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>{fileName}</span>
                </div>
              )}
              <button type="button" className="upload-preview__clear" onClick={clearFile} title="Remove file">✕</button>
            </div>
          )}
        </>
      )}

      <div className="field">
        <label>Invoice Number *</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={10}
          placeholder="10-digit invoice number"
          value={form.invoiceNumber}
          onChange={e => setField('invoiceNumber', e.target.value.replace(/\D/g, '').slice(0, 10))}
        />
        <span className="field-hint">10 digits — store code is the first 3 digits</span>
      </div>

      <div className="field">
        <label>Store / Branch Code</label>
        <input
          type="text"
          readOnly
          value={form.storeCode || deriveStoreCode(form.invoiceNumber)}
          placeholder="Auto from invoice"
          style={{ opacity: 0.85 }}
        />
      </div>

      <div className="field">
        <label>Purchase Date *</label>
        <input
          type="date"
          value={form.purchaseDate}
          onChange={e => setField('purchaseDate', e.target.value)}
        />
      </div>

      {mode === 'manual' && (
        <div className="field">
          <label>Product Description *</label>
          <input
            type="text"
            placeholder="e.g. NGK spark plugs"
            value={form.productDescription}
            onChange={e => setField('productDescription', e.target.value)}
          />
        </div>
      )}

      <div className="field">
        <label>Brand Purchased *</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          {brands.map(b => (
            <button
              key={b}
              type="button"
              onClick={() => setField('selectedBrand', b)}
              className={form.selectedBrand === b ? 'btn btn--primary' : 'btn btn--ghost'}
              style={{ flex: '1 1 80px' }}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Purchase Amount ($) *</label>
        <input
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          min="0"
          step="0.01"
          value={form.spendAmount}
          onChange={e => setField('spendAmount', e.target.value)}
        />
      </div>

      {mode === 'upload' ? (
        <button type="button" className="btn btn--ghost btn--full" style={{ marginBottom: 12, fontSize: '0.85rem' }} onClick={switchToManual}>
          Can't scan or upload? Enter details manually
        </button>
      ) : (
        <button type="button" className="btn btn--ghost btn--full" style={{ marginBottom: 12, fontSize: '0.85rem' }} onClick={switchToUpload}>
          Back to photo / upload
        </button>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button type="button" className="btn btn--ghost" onClick={onBack} disabled={submitting}>Back</button>
        <button type="submit" className="btn btn--primary" style={{ flex: 1 }} disabled={submitting}>
          {submitting
            ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Submitting...</>
            : 'Continue to Scratch →'}
        </button>
      </div>
    </form>
  );
}
