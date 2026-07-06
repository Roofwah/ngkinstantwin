import { useNavigate } from 'react-router-dom';
import { CampaignShell, CampaignLegalFooter } from '../components/CampaignArtFrame';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="page page--campaign">
      <CampaignShell landing>
        <div className="campaign-shell__action">
          <button
            type="button"
            className="btn btn--primary btn--landing-cta"
            onClick={() => navigate('/enter')}
          >
            Enter Now →
          </button>
          <CampaignLegalFooter />
        </div>
      </CampaignShell>

      <section className="landing-more">
        <div className="container">
          <h2 className="landing-more__title">How It Works</h2>
          <div style={{ display: 'grid', gap: 16 }}>
            {[
              { n: '01', title: 'Shop Eligible Brands', desc: 'Spend $50+ on eligible products at a participating store.' },
              { n: '02', title: 'Enter Your Claim', desc: 'Enter your mobile number and confirm your purchase.' },
              { n: '03', title: 'Scratch & Reveal', desc: 'Instantly find out if you\'ve won.' },
              { n: '04', title: 'Claim Your Prize', desc: 'Provisional wins are validated before fulfilment.' },
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
        </div>
      </section>
    </div>
  );
}
