import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="page">
      {/* Top bar */}
      <header className="topbar" style={{ justifyContent: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: '0.08em' }}>
          POWERED BY PURERANDOM™
        </span>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <img src="/logos/rrlogo.png" alt="Repco Rewards" style={{ maxWidth: 280, width: '100%' }} />
          </div>

          <h1 className="hero__title">
            Scratch<br /><span>&amp; Win</span>
          </h1>

          <div className="hero__brands">
            <img src="/logos/logos.png" alt="NGK · NTK · KYB" style={{ maxWidth: 260, width: '100%' }} />
          </div>

          <p className="hero__sub">
            Spend $50+ on eligible NGK, NTK, or KYB products. Upload your receipt. Scratch to reveal your instant prize.
          </p>

          <button className="btn btn--primary btn--full" onClick={() => navigate('/claim')} style={{ maxWidth: 320, margin: '0 auto', display: 'block' }}>
            Enter Now →
          </button>

          {/* Prize tier overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 48, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            {[
              { tier: 'Tier 1', label: 'Instant Prizes', desc: 'Caps · Coolers · Vouchers', color: '#00c853', glow: 'rgba(0,200,83,0.18)' },
              { tier: 'Tier 2', label: '$50–$1k Prizes', desc: 'Tool Kits · Repco Vouchers', color: 'var(--amber)', glow: 'var(--amber-glow)' },
              { tier: 'Tier 3', label: 'Premium Prizes', desc: 'Bathurst · $5k Rewards', color: 'var(--red)', glow: 'var(--red-glow)' },
            ].map(t => (
              <div key={t.tier} className="card" style={{ borderColor: t.color, boxShadow: `0 0 16px ${t.glow}`, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: t.color, marginBottom: 4 }}>
                  {t.tier}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>
                  {t.label}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>
                  {t.desc}
                </div>
              </div>
            ))}
          </div>

          <p className="hero__powered">
            Powered by PureRandom Instant Win Engine
          </p>

          <p style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--text-3)' }}>
            Prize outcomes are determined by a secure server-side manifest.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: 'var(--bg-2)', borderTop: '1px solid var(--border)', padding: '48px 16px' }}>
        <div className="container">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, textAlign: 'center', marginBottom: 32, letterSpacing: '0.02em' }}>
            How It Works
          </h2>
          <div style={{ display: 'grid', gap: 16 }}>
            {[
              { n: '01', title: 'Shop Eligible Brands', desc: 'Spend $50+ on NGK, NTK, or KYB products at Repco.' },
              { n: '02', title: 'Enter Your Claim', desc: 'Enter your mobile number, upload your receipt, and confirm your purchase.' },
              { n: '03', title: 'Scratch & Reveal', desc: 'Instantly find out if you\'ve won. Tier 1 prizes are yours immediately.' },
              { n: '04', title: 'Claim Your Prize', desc: 'Tier 2 & 3 provisional wins are validated against your receipt before fulfilment.' },
            ].map(s => (
              <div key={s.n} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, color: 'var(--green)', minWidth: 40, lineHeight: 1 }}>{s.n}</span>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-2)' }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button className="btn btn--primary" onClick={() => navigate('/claim')}>
              Start My Claim →
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', padding: '20px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.8 }}>
          Repco Rewards × NGK / NTK / KYB Scratch &amp; Win Promotion — Prototype Demo<br />
          Instant win outcomes are determined by a secure server-side prize manifest prior to reveal.<br />
          Tier 2 and Tier 3 prizes are provisional and subject to validation against eligible purchase data.<br />
          <span style={{ color: 'var(--text-3)' }}>Powered by PureRandom Instant Win Engine</span>
        </p>
      </footer>
    </div>
  );
}
