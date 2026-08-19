import { NavLink, useNavigate } from 'react-router-dom';
import { AdminCampaignProvider, useAdminCampaign, campaignPreviewPath } from '../admin/adminCampaign';

const NAV = [
  { to: '/admin/dashboard',      label: 'Dashboard' },
  { to: '/admin/demo-prizes',    label: 'Demo prizes' },
  { to: '/admin/manifest',       label: 'Prize Manifest' },
  { to: '/admin/claims',         label: 'Claims' },
  { to: '/admin/reconciliation', label: 'Reconciliation' },
  { to: '/admin/audit',          label: 'Audit Log' },
];

function AdminShell({ children, title, actions }) {
  const navigate = useNavigate();
  const { campaignId, campaign, campaigns, setCampaignId } = useAdminCampaign();

  function logout() {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  }

  return (
    <div className="admin-shell">
      <nav className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <img src="/logos/purerandom.svg" alt="PureRandom" style={{ height: 26, marginBottom: 4 }} />
          <span style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-3)' }}>ADMIN</span>
        </div>

        <div className="admin-nav__label">Campaign</div>
        <div style={{ padding: '0 16px 8px' }}>
          <select
            className="admin-campaign-select"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {campaign?.brand && (
            <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', marginTop: 6 }}>
              {campaign.brand}
            </div>
          )}
        </div>

        <div className="admin-nav__label">Navigation</div>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `admin-nav__link${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}

        <div style={{ marginTop: 'auto', padding: '16px 0 0' }}>
          <div className="admin-nav__label">Account</div>
          <a href={campaignPreviewPath(campaignId)} className="admin-nav__link" target="_blank" rel="noreferrer">
            View this campaign
          </a>
          <button
            onClick={logout}
            className="admin-nav__link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 'inherit' }}
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="admin-content">
        <div className="admin-topbar">
          <div>
            <h1>{title}</h1>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 2 }}>
              {campaign?.name || campaignId}
            </div>
          </div>
          {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children, title, actions }) {
  return (
    <AdminCampaignProvider>
      <AdminShell title={title} actions={actions}>
        {children}
      </AdminShell>
    </AdminCampaignProvider>
  );
}
