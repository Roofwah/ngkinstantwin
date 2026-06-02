import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getAdminAudit } from '../api';

const ACTION_BADGE = {
  MANIFEST_GENERATED: 'badge--blue',
  CLAIM_CREATED:      'badge--muted',
  ELIGIBILITY_CHECKED:'badge--muted',
  PRIZE_ASSIGNED:     'badge--green',
  SCRATCH_REVEALED:   'badge--blue',
  CLAIM_VALIDATED:    'badge--green',
  CLAIM_REJECTED:     'badge--red',
};

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    getAdminAudit()
      .then(d => { setLogs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter
    ? logs.filter(l => l.action === filter)
    : logs;

  const actions = [...new Set(logs.map(l => l.action))];

  return (
    <AdminLayout title="Audit Log" actions={
      <button className="btn btn--ghost btn--sm" onClick={() => { setLoading(true); getAdminAudit().then(d => { setLogs(d); setLoading(false); }); }}>↻ Refresh</button>
    }>
      <div className="card mb-16" style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>
        <strong style={{ color: 'var(--text)' }}>Tamper-evident audit chain:</strong> Each log entry includes a SHA-256 hash
        that chains the previous entry's hash, creating a verifiable audit trail. Any modification to a log entry
        will break the chain, making tampering detectable.
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button className={`btn btn--sm ${filter === '' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setFilter('')}>All</button>
        {actions.map(a => (
          <button key={a} className={`btn btn--sm ${filter === a ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setFilter(a)}>
            {a.replace(/_/g, ' ')}
          </button>
        ))}
        <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--text-3)', marginLeft: 8 }}>
          {filtered.length} entries
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="alert alert--info">No audit entries yet. Submit a claim to begin.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Claim ID</th>
                <th>Prize ID</th>
                <th>Details</th>
                <th>Hash</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                let details = {};
                try { details = l.details ? JSON.parse(l.details) : {}; } catch {}
                return (
                  <tr key={l.id}>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {new Date(l.timestamp).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td>
                      <span className={`badge ${ACTION_BADGE[l.action] || 'badge--muted'}`} style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                        {l.action.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '0.72rem' }}>
                      {l.claimId ? l.claimId.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="mono" style={{ fontSize: '0.72rem' }}>
                      {l.prizeId ? l.prizeId.slice(0, 12) + '…' : '—'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-2)', maxWidth: 200 }}>
                      {Object.entries(details).map(([k, v]) => (
                        <span key={k} style={{ display: 'block' }}>
                          <span style={{ color: 'var(--text-3)' }}>{k}:</span>{' '}
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      ))}
                    </td>
                    <td className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-3)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {l.hash?.slice(0, 16)}…
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
