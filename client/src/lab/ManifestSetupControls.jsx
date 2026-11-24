import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { generateLabManifest, getLabManifestInfo, postLabEvent } from '../api';

function stageRank(stages, id) {
  return stages.findIndex((s) => s.id === id);
}

export default function ManifestSetupControls({ config, session, onSessionUpdate }) {
  const [info, setInfo] = useState(null);
  const [windowHours, setWindowHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const currentStage = session?.stage || 'campaign_brief';
  const stages = config.journeyStages || [];
  const currentIdx = stageRank(stages, currentStage);

  useEffect(() => {
    let cancelled = false;
    getLabManifestInfo(config.campaignId)
      .then((data) => { if (!cancelled) setInfo(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [config.campaignId]);

  async function advance(stage, meta = {}) {
    if (!session?.sessionId) return;
    setBusy(true);
    setMsg('');
    try {
      const next = await postLabEvent(session.sessionId, stage, meta);
      onSessionUpdate?.(next);
    } catch (err) {
      setMsg(err.message || 'Could not advance stage');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    if (!session?.sessionId) return;
    setBusy(true);
    setMsg('');
    try {
      const next = await generateLabManifest(session.sessionId, windowHours);
      onSessionUpdate?.(next);
      const refreshed = await getLabManifestInfo(config.campaignId);
      setInfo(refreshed);
      setMsg(`Manifest ready — ${next.manifestInfo?.prizeCount ?? refreshed.totalPrizes} prizes scheduled.`);
    } catch (err) {
      setMsg(err.message || 'Manifest generation failed');
    } finally {
      setBusy(false);
    }
  }

  const catalogLines = info?.catalog
    ? [
      info.catalog.tier1?.length ? `Tier 1: ${info.catalog.tier1.map((p) => p.prizeName).join(', ')}` : null,
      info.catalog.tier2?.length ? `Tier 2: ${info.catalog.tier2.map((p) => p.prizeName).join(', ')}` : null,
      info.catalog.tier3?.length ? `Tier 3: ${info.catalog.tier3.map((p) => p.prizeName).join(', ')}` : null,
    ].filter(Boolean)
    : [];

  const customerLab = config.customerLabConfigId
    ? `/lab/${config.customerLabConfigId}`
    : null;

  return (
    <>
      <div className="lab-grid-2 lab-grid-2--compact">
        <div className="lab-card">
          <h3 className="lab-card__title">Campaign brief</h3>
          <p className="lab-card__body lab-card__body--tight">
            {config.brand} · {config.retailer}
          </p>
          <p className="lab-card__body lab-card__body--tight">
            {config.qualifyingPurchase}
          </p>
          <p className="lab-manifest-meta">
            Server campaign: <code>{config.campaignId}</code>
          </p>
          {currentIdx <= stageRank(stages, 'campaign_brief') && (
            <button
              type="button"
              className="lab-manifest-btn"
              disabled={busy || currentIdx > stageRank(stages, 'campaign_brief')}
              onClick={() => advance('prize_catalog')}
            >
              Confirm campaign brief
            </button>
          )}
        </div>

        <div className="lab-card lab-card--qualifying">
          <h3 className="lab-card__title">Prize catalog</h3>
          <p className="lab-card__body lab-card__body--tight">
            Nominated instant-win prizes for this campaign — tiers define the manifest pool.
          </p>
          {catalogLines.length > 0 ? (
            <ul className="lab-manifest-list">
              {catalogLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="lab-manifest-meta">Loading catalog…</p>
          )}
          {config.prizePresentation && (
            <p className="lab-manifest-meta">
              Instant win: {config.prizePresentation.tier1}
              {config.prizePresentation.tier2 ? ` · ${config.prizePresentation.tier2}` : ''}
              {config.prizePresentation.tier3 ? ` · ${config.prizePresentation.tier3}` : ''}
            </p>
          )}
          {currentIdx >= stageRank(stages, 'prize_catalog')
            && currentIdx < stageRank(stages, 'seed_published') && (
            <button
              type="button"
              className="lab-manifest-btn"
              disabled={busy}
              onClick={() => advance('seed_published', { seed: info?.seed })}
            >
              Publish seed
            </button>
          )}
        </div>
      </div>

      <div className="lab-card lab-card--seed">
        <h3 className="lab-card__title">Pure Random seed</h3>
        <p className="lab-card__body lab-card__body--tight">
          This seed deterministically generates the prize schedule via SHA-256.
          In production, a Bitcoin block hash is published before the campaign begins.
        </p>
        <div className="lab-seed-block">{info?.seed || '…'}</div>
        {info?.manifestAge && (
          <p className="lab-manifest-meta">
            Last manifest: {new Date(info.manifestAge).toLocaleString('en-AU')}
            {' · '}
            {info.totalPrizes} prizes ({info.remainingPrizes} remaining)
          </p>
        )}
      </div>

      <div className="lab-card">
        <h3 className="lab-card__title">Generate prize manifest</h3>
        <p className="lab-card__body lab-card__body--tight">
          Rebuilds the prize pool for this campaign only. Each prize receives a winning window
          and tamper-evident audit hash before any customer scans.
        </p>
        <div className="lab-manifest-actions">
          <label className="lab-manifest-window">
            Window (hours)
            <input
              type="number"
              min="1"
              max="168"
              value={windowHours}
              onChange={(e) => setWindowHours(parseInt(e.target.value, 10) || 24)}
            />
          </label>
          <button
            type="button"
            className="lab-manifest-btn lab-manifest-btn--primary"
            disabled={busy || currentIdx < stageRank(stages, 'seed_published')}
            onClick={handleGenerate}
          >
            {busy ? 'Generating…' : 'Generate manifest'}
          </button>
        </div>
        {session?.manifestInfo?.prizeCount != null && (
          <p className="lab-manifest-meta">
            {session.manifestInfo.prizeCount} prizes · {session.manifestInfo.windowHours}h window
          </p>
        )}
        {session?.manifestInfo?.sampleAuditHash && (
          <p className="lab-manifest-hash" title="Sample audit hash">
            Audit: {session.manifestInfo.sampleAuditHash.slice(0, 16)}…
          </p>
        )}
      </div>

      <div className="lab-manifest-footer-actions">
        {currentIdx >= stageRank(stages, 'manifest_ready')
          && currentIdx < stageRank(stages, 'audit_verified') && (
          <button
            type="button"
            className="lab-manifest-btn"
            disabled={busy}
            onClick={() => advance('audit_verified')}
          >
            Verify audit trail
          </button>
        )}
        {currentIdx >= stageRank(stages, 'audit_verified')
          && currentIdx < stageRank(stages, 'campaign_live') && (
          <button
            type="button"
            className="lab-manifest-btn lab-manifest-btn--primary"
            disabled={busy}
            onClick={() => advance('campaign_live')}
          >
            Mark campaign live
          </button>
        )}
        {currentStage === 'campaign_live' && customerLab && (
          <Link to={customerLab} className="lab-manifest-link">
            Start customer journey →
          </Link>
        )}
      </div>

      {msg && (
        <p className={`lab-manifest-msg ${msg.startsWith('Manifest ready') ? 'lab-manifest-msg--ok' : ''}`}>
          {msg}
        </p>
      )}
    </>
  );
}
