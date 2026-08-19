import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { getDemoControl, saveDemoControl, resetDemoSequence } from '../api';
import { useAdminCampaign } from '../admin/adminCampaign';

function emptyPrize() {
  return { name: '', value: '', qty: 4 };
}

export default function AdminDemoControl() {
  return (
    <AdminLayout title="Demo prizes">
      <DemoControlBody />
    </AdminLayout>
  );
}

function DemoControlBody() {
  const { campaignId, campaign } = useAdminCampaign();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [winEvery, setWinEvery] = useState(2);
  const [sweepstakesOnLose, setSweepstakesOnLose] = useState(true);
  const [sweepstakesMessage, setSweepstakesMessage] = useState('');
  const [prizes, setPrizes] = useState([emptyPrize()]);
  const [status, setStatus] = useState(null);

  async function load() {
    setLoading(true);
    setMsg('');
    setError('');
    try {
      const data = await getDemoControl(campaignId);
      applyStatus(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function applyStatus(data) {
    setStatus(data);
    setEnabled(data.enabled !== false);
    setWinEvery(data.winEvery || 2);
    setSweepstakesOnLose(data.sweepstakesOnLose !== false);
    setSweepstakesMessage(data.sweepstakesMessage || '');
    setPrizes(data.prizes?.length ? data.prizes.map((p) => ({
      name: p.name,
      value: p.value ?? '',
      qty: p.qty ?? 1,
    })) : [emptyPrize()]);
  }

  useEffect(() => {
    load();
  }, [campaignId]);

  function updatePrize(index, field, value) {
    setPrizes((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  async function handleSave() {
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const data = await saveDemoControl(campaignId, {
        enabled,
        winEvery: Number(winEvery) || 2,
        sweepstakesOnLose,
        sweepstakesMessage,
        prizes: prizes.filter((p) => String(p.name || '').trim()),
      });
      applyStatus(data);
      setMsg(`Saved. ${data.remainingPrizes} prizes loaded into the live pool for this campaign.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setMsg('');
    setError('');
    try {
      const data = await resetDemoSequence(campaignId);
      applyStatus(data);
      setMsg('Win sequence reset. The next entry will miss, then every Nth entry wins.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>;
  }

  return (
    <>
      {status?.demoMode === false && (
        <div className="alert alert--warn mb-16">
          DEMO_MODE is off. Timestamp windows still apply until you set DEMO_MODE=true and restart the server.
        </div>
      )}

      <div className="card mb-16">
        <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', marginBottom: 16, lineHeight: 1.5 }}>
          Control how <strong>{campaign?.name || campaignId}</strong> awards instant prizes in a live demo.
          Niterra keeps its original cadence unless you turn this on for that campaign too.
        </p>

        <label className="demo-control-check">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Use nominated prizes and every-Nth win (instead of the mixed 2nd/5th/12th/10th cadence)
        </label>

        <div className="demo-control-grid">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Every Nth entry wins</label>
            <input
              type="number"
              min="1"
              max="50"
              value={winEvery}
              onChange={(e) => setWinEvery(e.target.value)}
            />
            <span className="field-hint">2 = every second entry. 1 = every entry wins.</span>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-2)' }}>Next entry</label>
            <div className={`demo-next ${status?.nextIsWin ? 'is-win' : 'is-miss'}`}>
              {status?.nextIsWin ? 'WIN' : 'SWEEPSTAKES'}
            </div>
            <span className="field-hint">{status?.claimCount || 0} claims so far · {status?.remainingPrizes || 0} prizes left</span>
          </div>
        </div>

        <label className="demo-control-check" style={{ marginTop: 16 }}>
          <input
            type="checkbox"
            checked={sweepstakesOnLose}
            onChange={(e) => setSweepstakesOnLose(e.target.checked)}
          />
          Tell non-winners they are automatically entered into the sweepstakes prize draw
        </label>

        <div className="field" style={{ marginTop: 12, marginBottom: 0 }}>
          <label>Non-winner message</label>
          <textarea
            rows={3}
            value={sweepstakesMessage}
            onChange={(e) => setSweepstakesMessage(e.target.value)}
          />
        </div>
      </div>

      <div className="card mb-16">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>
              Nominated prizes
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 6 }}>
              Winners receive these in rotating order (one of each, then repeat). Use <code>{'{spend}'}</code> to show the shopper’s purchase amount, e.g. <code>{'{spend}'} HOKA purchase back</code>.
            </p>
          </div>
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => setPrizes((rows) => [...rows, emptyPrize()])}>
            Add prize
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Prize shown at winning moment</th>
                <th style={{ width: 110 }}>Value $</th>
                <th style={{ width: 90 }}>Qty</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {prizes.map((prize, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={prize.name}
                      placeholder="e.g. HOKA Bondi 8"
                      onChange={(e) => updatePrize(index, 'name', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={prize.value}
                      onChange={(e) => updatePrize(index, 'value', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={prize.qty}
                      onChange={(e) => updatePrize(index, 'qty', e.target.value)}
                    />
                  </td>
                  <td>
                    <button
                      className="btn btn--ghost btn--sm"
                      type="button"
                      onClick={() => setPrizes((rows) => rows.filter((_, i) => i !== index))}
                      disabled={prizes.length === 1}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {error && <div className="alert alert--error mb-16">{error}</div>}
      {msg && <div className="alert alert--info mb-16">{msg}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn--primary" type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save & load prize pool'}
        </button>
        <button className="btn btn--ghost" type="button" onClick={handleReset} disabled={saving}>
          Reset win sequence
        </button>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 12 }}>
        Save replaces unassigned prizes for this campaign only. Already-won prizes stay in the claims history.
      </p>
    </>
  );
}
