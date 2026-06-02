import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getAdminClaims } from '../api';

const RESULT_BADGE = {
  NOT_WINNER:            'badge--blue',
  TIER_1_INSTANT_WIN:    'badge--green',
  TIER_2_PROVISIONAL_WIN:'badge--amber',
  TIER_3_PROVISIONAL_WIN:'badge--red',
};

const STATUS_BADGE = {
  CREATED:            'badge--muted',
  ELIGIBLE:           'badge--blue',
  REVEALED:           'badge--blue',
  VALIDATION_PENDING: 'badge--amber',
  VALIDATED:          'badge--green',
  REJECTED:           'badge--red',
  FULFILLED:          'badge--green',
};

export default function AdminClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    getAdminClaims()
      .then(d => { setClaims(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = claims.filter(c => {
    const matchSearch =
      !search ||
      c.claimId.includes(search) ||
      c.mobile.includes(search) ||
      c.receiptNumber.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || c.claimStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout title="Claims" actions={
      <button className="btn btn--ghost btn--sm" onClick={() => { setLoading(true); getAdminClaims().then(d => { setClaims(d); setLoading(false); }); }}>↻ Refresh</button>
    }>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by claim ID, mobile, or receipt…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '8px 12px', fontSize: '0.88rem' }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '8px 12px', fontSize: '0.88rem' }}
        >
          <option value="ALL">All Statuses</option>
          {['CREATED','ELIGIBLE','REVEALED','VALIDATION_PENDING','VALIDATED','REJECTED','FULFILLED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--text-3)' }}>
          {filtered.length} claim{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="alert alert--info">No claims found.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Claim ID</th>
                <th>Mobile</th>
                <th>Receipt #</th>
                <th>Spend</th>
                <th>Brand</th>
                <th>Result</th>
                <th>Status</th>
                <th>Prize</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.claimId}>
                  <td className="mono" style={{ fontSize: '0.75rem' }}>{c.claimId.slice(0, 8)}…</td>
                  <td>{c.mobile.slice(0, 4)}****{c.mobile.slice(-2)}</td>
                  <td className="mono" style={{ fontSize: '0.78rem' }}>{c.receiptNumber}</td>
                  <td style={{ color: 'var(--green)' }}>${parseFloat(c.spendAmount).toFixed(2)}</td>
                  <td><span className="badge badge--muted">{c.selectedBrand}</span></td>
                  <td>
                    <span className={`badge ${RESULT_BADGE[c.result] || 'badge--muted'}`} style={{ fontSize: '0.65rem' }}>
                      {c.result.replace(/_/g,' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[c.claimStatus] || 'badge--muted'}`}>
                      {c.claimStatus}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{c.prizeName || <span style={{ color: 'var(--text-3)' }}>—</span>}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {new Date(c.createdAt).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
