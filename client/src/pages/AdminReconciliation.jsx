import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getAdminClaims, reconcileClaim } from '../api';

export default function AdminReconciliation() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [processing, setProcessing] = useState({});
  const [msg, setMsg] = useState({});

  async function load() {
    setLoading(true);
    try {
      const all = await getAdminClaims();
      setClaims(all.filter(c => c.claimStatus === 'VALIDATION_PENDING'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAction(claimId, action) {
    setProcessing(p => ({ ...p, [claimId]: action }));
    setMsg(m => ({ ...m, [claimId]: '' }));
    try {
      await reconcileClaim(claimId, action, notes[claimId] || '');
      setMsg(m => ({ ...m, [claimId]: action === 'VALIDATE' ? 'Validated' : 'Rejected' }));
      setTimeout(() => load(), 1200);
    } catch (err) {
      setMsg(m => ({ ...m, [claimId]: `Error: ${err.message}` }));
    } finally {
      setProcessing(p => ({ ...p, [claimId]: null }));
    }
  }

  const TIER_LABEL = { TIER_2_PROVISIONAL_WIN: 'Tier 2', TIER_3_PROVISIONAL_WIN: 'Tier 3' };

  return (
    <AdminLayout title="Reconciliation" actions={
      <button className="btn btn--ghost btn--sm" onClick={load}>↻ Refresh</button>
    }>
      <div className="card mb-16" style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
        <strong style={{ color: 'var(--text)' }}>Repco Rewards Validation (Mock)</strong><br />
        This screen simulates the weekly Repco Rewards reconciliation process.
        Tier 2 and Tier 3 provisional wins must be validated against the original receipt
        and Repco Rewards member data before prizes are dispatched.
        {/* PRODUCTION NOTE: This would integrate with the real Repco Rewards API
            to cross-reference member ID, purchase history, and receipt validation */}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : claims.length === 0 ? (
        <div className="alert alert--success">
          No claims pending validation. All provisional prizes have been resolved.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {claims.map(c => {
            const tier = TIER_LABEL[c.result] || 'Unknown';
            const isProcessing = processing[c.claimId];
            const resultMsg = msg[c.claimId];
            return (
              <div key={c.claimId} className={`card ${c.result === 'TIER_3_PROVISIONAL_WIN' ? 'card--red' : 'card--amber'}`}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  <div>
                    <span className={`badge ${c.result === 'TIER_3_PROVISIONAL_WIN' ? 'badge--red' : 'badge--amber'}`}>
                      {tier} Provisional Win
                    </span>
                    {c.result === 'TIER_3_PROVISIONAL_WIN' && (
                      <span className="badge badge--red" style={{ marginLeft: 6 }}>Manual Review Required</span>
                    )}
                  </div>
                  <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                    #{c.claimId.slice(0, 8)}
                  </span>
                </div>

                {/* Claim details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16, fontSize: '0.85rem' }}>
                  {[
                    { label: 'Prize', value: c.prizeName || '—', highlight: true },
                    { label: 'Mobile', value: c.mobile.slice(0,4) + '****' + c.mobile.slice(-2) },
                    { label: 'Receipt #', value: c.receiptNumber, mono: true },
                    { label: 'Brand', value: c.selectedBrand },
                    { label: 'Spend', value: `$${parseFloat(c.spendAmount).toFixed(2)}`, highlight: true },
                    { label: 'Submitted', value: new Date(c.createdAt).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' }) },
                  ].map(row => (
                    <div key={row.label}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)', marginBottom: 2 }}>{row.label}</div>
                      <div style={{ fontWeight: row.highlight ? 600 : 400, color: row.highlight ? 'var(--amber)' : 'var(--text)', fontFamily: row.mono ? 'monospace' : 'inherit', fontSize: row.mono ? '0.8rem' : 'inherit' }}>
                        {row.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Receipt link */}
                {c.receiptFilename && (
                  <div style={{ marginBottom: 16 }}>
                    <a
                      href={`/uploads/${c.receiptFilename}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn--ghost btn--sm"
                      style={{ display: 'inline-flex', gap: 6 }}
                    >
                      View Receipt
                    </a>
                  </div>
                )}

                {/* Admin note */}
                <div className="field" style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>
                    Admin Note (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Validation notes, reason for rejection, etc."
                    value={notes[c.claimId] || ''}
                    onChange={e => setNotes(n => ({ ...n, [c.claimId]: e.target.value }))}
                    style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '8px 12px', width: '100%', fontSize: '0.88rem' }}
                  />
                </div>

                {/* Actions */}
                {resultMsg ? (
                  <div className={`alert ${resultMsg.startsWith('Validated') ? 'alert--success' : 'alert--error'}`}>
                    {resultMsg}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn btn--primary btn--sm"
                      style={{ flex: 1 }}
                      disabled={!!isProcessing}
                      onClick={() => handleAction(c.claimId, 'VALIDATE')}
                    >
                      {isProcessing === 'VALIDATE' ? <span className="spinner" /> : 'Validate'}
                    </button>
                    <button
                      className="btn btn--red btn--sm"
                      style={{ flex: 1 }}
                      disabled={!!isProcessing}
                      onClick={() => handleAction(c.claimId, 'REJECT')}
                    >
                      {isProcessing === 'REJECT' ? <span className="spinner" /> : 'Reject'}
                    </button>
                  </div>
                )}

                <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 10 }}>
                  Tier 2 and Tier 3 prizes are provisional and subject to validation against eligible purchase data.
                  Rejecting a prize will void the manifest entry and mark this claim as rejected.
                </p>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
