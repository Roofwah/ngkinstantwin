import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function DeliveryDetails() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    addressLine1: '',
    suburb: '',
    state: '',
    postcode: '',
  });

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="page" style={{ background: 'var(--bg)' }}>
        <main style={{ flex: 1, padding: '32px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="container">
            <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <h1 className="enter-form__title">Delivery details received</h1>
              <p style={{ color: 'var(--text-2)', marginTop: 12 }}>
                Thank you — your prize will be dispatched to the address provided.
              </p>
              <button type="button" className="btn btn--primary btn--full" style={{ marginTop: 20 }}
                onClick={() => navigate(`/result/${claimId}`)}>
                Back to result
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <header className="topbar" style={{ justifyContent: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: '0.08em' }}>POWERED BY PURERANDOM™</span>
      </header>
      <main style={{ flex: 1, padding: '32px 16px' }}>
        <div className="container">
          <form className="card campaign-shell__card" onSubmit={handleSubmit}>
            <h2 className="enter-form__title">Delivery Details</h2>
            <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginBottom: 16 }}>
              Enter where we should send your prize.
            </p>
            <div className="field">
              <label>Street address *</label>
              <input type="text" required value={form.addressLine1}
                onChange={(e) => setField('addressLine1', e.target.value)} />
            </div>
            <div className="field">
              <label>Suburb *</label>
              <input type="text" required value={form.suburb}
                onChange={(e) => setField('suburb', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>State *</label>
                <input type="text" required value={form.state}
                  onChange={(e) => setField('state', e.target.value)} />
              </div>
              <div className="field">
                <label>Postcode *</label>
                <input type="text" inputMode="numeric" required maxLength={4} value={form.postcode}
                  onChange={(e) => setField('postcode', e.target.value.replace(/\D/g, '').slice(0, 4))} />
              </div>
            </div>
            <button type="submit" className="btn btn--primary btn--full">Submit delivery details</button>
          </form>
        </div>
      </main>
    </div>
  );
}
