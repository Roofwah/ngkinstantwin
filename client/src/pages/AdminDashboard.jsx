import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { getAdminStats, generateManifest } from '../api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState('');
  const [windowHours, setWindowHours] = useState(24);

  async function load() {
    try {
      const s = await getAdminStats();
      setStats(s);
    } catch {
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleGenerate() {
    setGenerating(true);
    setMsg('');
    try {
      const r = await generateManifest(windowHours);
      setMsg(`Manifest generated — ${r.prizeCount} prizes across ${windowHours}h window.`);
      load();
    } catch (err) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  const statCards = stats ? [
    { label: 'Total Claims',        value: stats.totalClaims,       color: 'var(--text)' },
    { label: 'Eligible Claims',     value: stats.eligibleClaims,    color: 'var(--blue)' },
    { label: 'Instant Prizes Won',  value: stats.instantPrizes,     color: 'var(--green)' },
    { label: 'Provisional Pending', value: stats.provisionalPending, color: 'var(--amber)' },
    { label: 'Validated',           value: stats.validatedClaims,   color: 'var(--green-dim)' },
    { label: 'Rejected',            value: stats.rejectedClaims,    color: 'var(--red)' },
    { label: 'Prizes Remaining',    value: stats.remainingPrizes,   color: 'var(--blue)' },
    { label: 'Total Prizes',        value: stats.totalPrizes,       color: 'var(--text-2)' },
  ] : [];

  return (
    <AdminLayout
      title="Dashboard"
      actions={
        <button className="btn btn--ghost btn--sm" onClick={load}>↻ Refresh</button>
      }
    >
      {stats?.demoMode && (
        <div className="demo-banner mb-16">
          DEMO MODE ACTIVE — Every 5th claim wins Tier 1 · Every 12th wins Tier 2 · Every 30th wins Tier 3
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
      ) : (
        <>
          <div className="stat-grid">
            {statCards.map(s => (
              <div className="stat-card" key={s.label}>
                <div className="stat-card__value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-card__label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Seed info */}
          <div className="card mb-16">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>
              PureRandom Seed (Mock Bitcoin Block Hash)
            </div>
            <div className="seed-block">{stats?.seed}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
              This seed is used to deterministically generate the prize schedule via SHA-256.
              In production, this would be a real Bitcoin block hash published before the campaign begins,
              providing verifiable randomness that neither the operator nor participants can predict or manipulate.
            </p>

            {stats?.manifestAge && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 8 }}>
                Manifest generated: {new Date(stats.manifestAge).toLocaleString('en-AU')}
              </p>
            )}
          </div>

          {/* Generate manifest */}
          <div className="card mb-16">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>
              Generate Prize Manifest
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: 14 }}>
              Generates a new prize schedule from the seed. All prizes are assigned deterministic
              winning timestamps across the campaign window. Warning: This will clear any existing manifest.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', align: 'center', gap: 8 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-2)', whiteSpace: 'nowrap', alignSelf: 'center' }}>Window (hours):</label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={windowHours}
                  onChange={e => setWindowHours(parseInt(e.target.value) || 24)}
                  style={{ width: 80, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', padding: '8px 10px', fontSize: '0.9rem' }}
                />
              </div>
              <button className="btn btn--amber btn--sm" onClick={handleGenerate} disabled={generating}>
                {generating ? <><span className="spinner" /> Generating…</> : 'Generate Manifest'}
              </button>
            </div>
            {msg && <div className={`alert ${msg.startsWith('Manifest') ? 'alert--success' : 'alert--error'} mt-16`}>{msg}</div>}
          </div>

          {/* Quick links */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 12 }}>
            {[
              { to: '/admin/manifest',       label: 'Prize Manifest',    desc: 'View all prizes and windows' },
              { to: '/admin/claims',         label: 'Claims Table',      desc: 'All submitted claims' },
              { to: '/admin/reconciliation', label: 'Reconciliation',    desc: 'Validate Tier 2/3 wins' },
              { to: '/admin/audit',          label: 'Audit Log',         desc: 'Tamper-evident action log' },
            ].map(l => (
              <button
                key={l.to}
                className="card"
                style={{ cursor: 'pointer', textAlign: 'left', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px' }}
                onClick={() => navigate(l.to)}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{l.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{l.desc}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
