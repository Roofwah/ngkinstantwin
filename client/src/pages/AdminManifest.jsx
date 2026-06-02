import { useState, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getAdminManifest } from '../api';

const STATUS_BADGE = {
  AVAILABLE: 'badge--green',
  ASSIGNED:  'badge--amber',
  VOIDED:    'badge--red',
};

export default function AdminManifest() {
  const [manifest, setManifest] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    getAdminManifest()
      .then(d => { setManifest(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? manifest : manifest.filter(p => p.status === filter);

  const now = Date.now();

  return (
    <AdminLayout title="Prize Manifest">
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: 12 }}>
          The prize manifest was generated deterministically from the PureRandom seed. Each prize has a scheduled
          winning timestamp and window. When a claim is submitted within a prize's window, that prize is assigned.
          Winning timestamps are only visible in this admin view — never exposed to customers.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['ALL', 'AVAILABLE', 'ASSIGNED', 'VOIDED'].map(s => (
            <button
              key={s}
              className={`btn btn--sm ${filter === s ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setFilter(s)}
            >
              {s}
            </button>
          ))}
          <span style={{ alignSelf: 'center', fontSize: '0.8rem', color: 'var(--text-3)', marginLeft: 8 }}>
            {filtered.length} prize{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : manifest.length === 0 ? (
        <div className="alert alert--warn">
          No manifest found. Go to Dashboard → Generate Manifest to create the prize schedule.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tier</th>
                <th>Prize Name</th>
                <th>Value</th>
                <th>Winning Window</th>
                <th>Window (s)</th>
                <th>Status</th>
                <th>Assigned Claim</th>
                <th>Seed Hash</th>
                <th>Audit Hash</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const winStart = new Date(p.winningTimestamp);
                const winEnd   = new Date(p.winningTimestamp + p.winningWindowSeconds * 1000);
                const isOpen   = now >= p.winningTimestamp && now <= p.winningTimestamp + p.winningWindowSeconds * 1000;
                return (
                  <tr key={p.prizeId}>
                    <td>
                      <span className={`badge ${p.tier === 1 ? 'badge--green' : p.tier === 2 ? 'badge--amber' : 'badge--red'}`}>
                        T{p.tier}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.prizeName}</td>
                    <td style={{ color: 'var(--green)' }}>${p.value.toLocaleString()}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      <div>{winStart.toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}</div>
                      <div style={{ color: 'var(--text-3)' }}>→ {winEnd.toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}</div>
                      {isOpen && <span className="badge badge--green" style={{ marginTop: 4 }}>OPEN NOW</span>}
                    </td>
                    <td>{p.winningWindowSeconds}s</td>
                    <td><span className={`badge ${STATUS_BADGE[p.status] || 'badge--muted'}`}>{p.status}</span></td>
                    <td className="mono" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.assignedClaimId ? p.assignedClaimId.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="mono" style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.seedHash?.slice(0, 10)}…
                    </td>
                    <td className="mono" style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.auditHash?.slice(0, 10)}…
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
