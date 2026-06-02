import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClaim } from '../api';

const CONFIGS = {
  TIER_1_INSTANT_WIN: {
    icon: null,
    badgeClass: 'badge--green',
    cardClass: 'card--green',
    statusLabel: 'Instant Prize',
    headline: 'You Won!',
    headlineColor: 'var(--green)',
    body: 'Congratulations! Your Tier 1 instant prize has been confirmed. You will be contacted on the mobile number you provided to arrange delivery.',
    nextSteps: 'Your prize will be dispatched within 5–7 business days. No further action required.',
  },
  TIER_2_PROVISIONAL_WIN: {
    icon: null,
    badgeClass: 'badge--amber',
    cardClass: 'card--amber',
    statusLabel: 'Provisional Prize — Pending Validation',
    headline: 'Provisional Win!',
    headlineColor: 'var(--amber)',
    body: 'You have provisionally won a Tier 2 prize! Your claim will be validated against your eligible purchase data. You will be contacted within 5 business days.',
    nextSteps: 'Keep your original receipt. Our team will verify your purchase before the prize is confirmed.',
  },
  TIER_3_PROVISIONAL_WIN: {
    icon: null,
    badgeClass: 'badge--red',
    cardClass: 'card--red',
    statusLabel: 'Manual Review Required',
    headline: 'Premium Win!',
    headlineColor: 'var(--red)',
    body: 'Outstanding! You have provisionally won a premium Tier 3 prize. This prize requires manual verification of your eligible purchase.',
    nextSteps: 'Our prize team will contact you within 3 business days. Keep your original receipt and proof of purchase.',
  },
  NOT_WINNER: {
    icon: null,
    badgeClass: 'badge--blue',
    cardClass: 'card--blue',
    statusLabel: 'Draw Entry Confirmed',
    headline: 'Not This Time',
    headlineColor: 'var(--blue)',
    body: 'You didn\'t win an instant prize this time, but your eligible claim has been entered into the draw. Good luck!',
    nextSteps: 'Draw entries are tallied weekly. You\'ll be notified if you win a draw prize.',
  },
};

export default function Result() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClaim(claimId)
      .then(d => { setClaim(d); setLoading(false); })
      .catch(() => navigate('/'));
  }, [claimId, navigate]);

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
      </div>
    );
  }

  const result = claim?.result || 'NOT_WINNER';
  const cfg = CONFIGS[result] || CONFIGS.NOT_WINNER;

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <header className="topbar" style={{ justifyContent: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: '0.08em' }}>POWERED BY PURERANDOM™</span>
      </header>

      <main style={{ flex: 1, padding: '32px 16px' }}>
        <div className="container">

          {/* Result card */}
          <div className={`card ${cfg.cardClass}`} style={{ textAlign: 'center', padding: '36px 24px' }}>
            <div style={{ marginBottom: 12 }}>
              <span className={`badge ${cfg.badgeClass}`}>
                {cfg.statusLabel}
              </span>
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, color: cfg.headlineColor, marginBottom: 8, letterSpacing: '0.02em' }}>
              {cfg.headline}
            </h1>

            {claim?.prizeName && result !== 'NOT_WINNER' && (
              <>
                <div className="result-prize-name">{claim.prizeName}</div>
              </>
            )}

            <p style={{ fontSize: '0.95rem', color: 'var(--text-2)', marginTop: 16, lineHeight: 1.7 }}>
              {cfg.body}
            </p>
          </div>

          {/* Claim details */}
          <div className="card mt-16">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 12 }}>
              Claim Details
            </div>
            <div style={{ display: 'grid', gap: 10, fontSize: '0.88rem' }}>
              {[
                { label: 'Claim ID', value: <span className="mono">{claimId?.slice(0,8)}…</span> },
                { label: 'Mobile', value: claim?.mobile?.slice(0,4) + '****' + claim?.mobile?.slice(-2) },
                { label: 'Receipt #', value: claim?.receiptNumber },
                { label: 'Brand', value: claim?.selectedBrand },
                { label: 'Spend', value: `$${parseFloat(claim?.spendAmount || 0).toFixed(2)}` },
                { label: 'Status', value: <span className="badge badge--muted">{claim?.claimStatus}</span> },
                { label: 'Submitted', value: claim?.createdAt ? new Date(claim.createdAt).toLocaleString('en-AU') : '—' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <span style={{ color: 'var(--text-3)' }}>{row.label}</span>
                  <span>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Next steps */}
          <div className="alert alert--info mt-16">
            <strong>Next steps:</strong> {cfg.nextSteps}
          </div>

          {/* Compliance */}
          <div className="compliance-note mt-16">
            Instant win outcomes are determined by a secure server-side prize manifest prior to reveal.
            Tier 2 and Tier 3 prizes are provisional and subject to validation against eligible purchase data.
            Non-winning eligible claims may be entered into a later prize draw if configured.
          </div>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button className="btn btn--ghost" onClick={() => navigate('/')}>
              ← Back to Home
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
