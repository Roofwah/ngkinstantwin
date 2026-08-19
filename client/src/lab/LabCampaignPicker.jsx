import { Link } from 'react-router-dom';
import { listLabCampaigns } from '../config/labCampaigns';

export default function LabCampaignPicker() {
  const campaigns = listLabCampaigns();

  return (
    <div className="lab-picker">
      <header className="lab-picker__header">
        <div className="lab-eyebrow">Turnstyle Lab</div>
        <h1 className="lab-picker__title">Choose a promotional program</h1>
        <p className="lab-picker__subtitle">
          The Lab shell is campaign-agnostic. Each program has its own branding, retailer,
          access point, and qualifying rules — wired to a server campaign for real outcomes.
        </p>
      </header>

      <ul className="lab-picker__list">
        {campaigns.map((c) => (
          <li key={c.configId}>
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
          </li>
        ))}
      </ul>

      {campaigns.length === 0 && (
        <p className="lab-picker__empty">No lab campaigns registered. Add a config under <code>config/labCampaigns/</code>.</p>
      )}
    </div>
  );
}
