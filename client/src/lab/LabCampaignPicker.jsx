import { Link } from 'react-router-dom';
import { listLabCampaigns } from '../config/labCampaigns';

function CampaignCard({ c }) {
  return (
    <Link to={`/lab/${c.configId}`} className="lab-picker__card">
      <div className="lab-picker__card-top">
        <span className="lab-picker__name">{c.campaignName}</span>
        <span
          className="lab-picker__accent"
          style={{ background: c.branding?.accentColor || '#00c8ff' }}
        />
      </div>
      <div className="lab-picker__meta">
        {c.brand} · {c.retailer}
      </div>
      <div className="lab-picker__id">
        Server campaign: <code>{c.campaignId}</code>
      </div>
    </Link>
  );
}

export default function LabCampaignPicker() {
  const campaigns = listLabCampaigns();
  const setup = campaigns.filter((c) => c.labMode === 'manifest');
  const customer = campaigns.filter((c) => c.labMode !== 'manifest');

  return (
    <div className="lab-picker">
      <header className="lab-picker__header">
        <div className="lab-eyebrow">Turnstyle Lab</div>
        <h1 className="lab-picker__title">Choose a promotional program</h1>
        <p className="lab-picker__subtitle">
          The Lab shell is campaign-agnostic. Run manifest creation first, then walk through
          the customer journey — same presenter language for both.
        </p>
      </header>

      {setup.length > 0 && (
        <section className="lab-picker__section">
          <h2 className="lab-picker__section-title">Campaign setup</h2>
          <p className="lab-picker__section-desc">
            Prize catalog, Pure Random seed, and manifest generation before go-live.
          </p>
          <ul className="lab-picker__list">
            {setup.map((c) => (
              <li key={c.configId}>
                <CampaignCard c={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {customer.length > 0 && (
        <section className="lab-picker__section">
          <h2 className="lab-picker__section-title">Customer journey</h2>
          <p className="lab-picker__section-desc">
            Live demo of scan, verify, instant win, and fulfilment on phone and PUK.
          </p>
          <ul className="lab-picker__list">
            {customer.map((c) => (
              <li key={c.configId}>
                <CampaignCard c={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {campaigns.length === 0 && (
        <p className="lab-picker__empty">
          No lab campaigns registered. Add a config under <code>config/labCampaigns/</code>.
        </p>
      )}
    </div>
  );
}
