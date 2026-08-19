import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { getAdminStats, generateManifest } from '../api';
import { useAdminCampaign } from '../admin/adminCampaign';

function DashboardBody() {
  const navigate = useNavigate();
  const { campaignId, campaign } = useAdminCampaign();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState('');
  const [windowHours, setWindowHours] = useState(24);

  async function load() {
    try {
      const s = await getAdminStats(campaignId);
      setStats(s);
    } catch {
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setMsg('');
    load();
  }, [campaignId]);

  async function handleGenerate() {
    setGenerating(true);
    setMsg('');
    try {
      const r = await generateManifest(windowHours, campaignId);
      setMsg(`Manifest generated for ${campaign?.name || campaignId} — ${r.prizeCount} prizes. Other campaigns were not changed.`);
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
    <>
      {stats?.demoMode && (
        <div className="demo-banner mb-16">
          {stats.demoControl?.enabled
            ? `DEMO MODE — every ${stats.demoControl.winEvery === 1 ? 'entry' : `${stats.demoControl.winEvery === 2 ? '2nd' : `${stats.demoControl.winEvery}th`} entry`} wins a nominated prize. Non-winners enter the sweepstakes. Next: ${stats.demoControl.nextIsWin ? 'WIN' : 'SWEEPSTAKES'}.`
            : 'DEMO MODE — this campaign only. Every 2nd or 5th claim wins Tier 1 · Every 12th wins Tier 2 · Every 10th wins Tier 3'}
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

          <div className="card mb-16">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>
              PureRandom Seed (Mock Bitcoin Block Hash)
            </div>
            <div className="seed-block">{stats?.seed}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
              This seed is used to deterministically generate the prize schedule via SHA-256.
              In production, this would be a real Bitcoin block hash published before the campaign begins.
            </p>
            {stats?.manifestAge && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 8 }}>
                Manifest generated: {new Date(stats.manifestAge).toLocaleString('en-AU')}
              </p>
            )}
          </div>

          <div className="card mb-16">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>
              Generate Prize Manifest — {campaign?.name || campaignId}
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: 14 }}>
              {stats?.demoControl?.enabled
                ? 'Reloads this campaign’s nominated demo prizes into the live pool. Already-assigned wins are kept.'
                : 'Rebuilds the prize pool for this campaign only. Niterra, HOKA and other demos keep their own manifests.'}
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 8 }}>
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
            {msg && <div className={`alert ${msg.startsWith('Manifest') || msg.startsWith('Demo') ? 'alert--success' : 'alert--error'} mt-16`}>{msg}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 12 }}>
            {[
              { to: '/admin/demo-prizes',    label: 'Demo prizes',       desc: 'Win rate and nominated prizes' },
              { to: '/admin/manifest',       label: 'Prize Manifest',    desc: 'This campaign’s prizes' },
              { to: '/admin/claims',         label: 'Claims Table',      desc: 'This campaign’s entries' },
              { to: '/admin/reconciliation', label: 'Reconciliation',    desc: 'Validate Tier 2/3 wins' },
              { to: '/admin/audit',          label: 'Audit Log',         desc: 'This campaign’s actions' },
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
    </>
  );
}

export default function AdminDashboard() {
  return (
    <AdminLayout
      title="Dashboard"
      actions={
        <button className="btn btn--ghost btn--sm" onClick={() => window.location.reload()}>↻ Refresh</button>
      }
    >
      <DashboardBody />
    </AdminLayout>
  );
}
