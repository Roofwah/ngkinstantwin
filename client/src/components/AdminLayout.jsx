import { NavLink, useNavigate } from 'react-router-dom';

const NAV = [
  { to: '/admin/dashboard',      label: 'Dashboard' },
  { to: '/admin/manifest',       label: 'Prize Manifest' },
  { to: '/admin/claims',         label: 'Claims' },
  { to: '/admin/reconciliation', label: 'Reconciliation' },
  { to: '/admin/audit',          label: 'Audit Log' },
];

export default function AdminLayout({ children, title, actions }) {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  }

  return (
    <div className="admin-shell">
      <nav className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <img src="/logos/rrlogo.png" alt="Repco" style={{ height: 26, marginBottom: 4 }} />
          <span style={{ display: 'block', fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-3)' }}>ADMIN</span>
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
          <a href="/" className="admin-nav__link" target="_blank" rel="noreferrer">
            View Campaign
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
          <h1>{title}</h1>
          {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
