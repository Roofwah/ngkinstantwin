import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listLabCampaigns } from '../config/labCampaigns';

function groupCampaigns(campaigns) {
  return {
    setup: campaigns.filter((c) => c.labMode === 'manifest'),
    customer: campaigns.filter((c) => c.labMode !== 'manifest'),
  };
}

export default function LabNav({ currentConfigId }) {
  const navigate = useNavigate();
  const campaigns = listLabCampaigns();
  const { setup, customer } = groupCampaigns(campaigns);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const current = currentConfigId
    ? campaigns.find((c) => c.configId === currentConfigId)
    : null;

  const manifestSibling = currentConfigId
    ? campaigns.find((c) => c.customerLabConfigId === currentConfigId)
    : null;

  const customerSibling = current?.customerLabConfigId
    ? campaigns.find((c) => c.configId === current.customerLabConfigId)
    : null;

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  function pickCampaign(configId) {
    setMenuOpen(false);
    if (configId && configId !== currentConfigId) {
      navigate(`/lab/${configId}`);
    }
  }

  return (
    <nav className="lab-nav" aria-label="Turnstyle Lab">
      <Link to="/lab" className="lab-nav__brand">
        Turnstyle Lab
      </Link>

      <div className="lab-nav__campaign" ref={menuRef}>
        <button
          type="button"
          className="lab-nav__campaign-btn"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
        >
          <span className="lab-nav__campaign-label">
            {current ? current.campaignName : 'Change campaign'}
          </span>
          <span className="lab-nav__chevron" aria-hidden="true">▾</span>
        </button>

        {menuOpen && (
          <div className="lab-nav__menu" role="listbox">
            {setup.length > 0 && (
              <>
                <div className="lab-nav__menu-heading">Campaign setup</div>
                {setup.map((c) => (
                  <button
                    key={c.configId}
                    type="button"
                    role="option"
                    aria-selected={c.configId === currentConfigId}
                    className={`lab-nav__menu-item${c.configId === currentConfigId ? ' lab-nav__menu-item--active' : ''}`}
                    onClick={() => pickCampaign(c.configId)}
                  >
                    <span className="lab-nav__menu-name">{c.campaignName}</span>
                    <span className="lab-nav__menu-meta">{c.brand} · {c.retailer}</span>
                  </button>
                ))}
              </>
            )}
            {customer.length > 0 && (
              <>
                <div className="lab-nav__menu-heading">Customer journey</div>
                {customer.map((c) => (
                  <button
                    key={c.configId}
                    type="button"
                    role="option"
                    aria-selected={c.configId === currentConfigId}
                    className={`lab-nav__menu-item${c.configId === currentConfigId ? ' lab-nav__menu-item--active' : ''}`}
                    onClick={() => pickCampaign(c.configId)}
                  >
                    <span className="lab-nav__menu-name">{c.campaignName}</span>
                    <span className="lab-nav__menu-meta">{c.brand} · {c.retailer}</span>
                  </button>
                ))}
              </>
            )}
            <Link to="/lab" className="lab-nav__menu-all" onClick={() => setMenuOpen(false)}>
              All programs…
            </Link>
          </div>
        )}
      </div>

      <div className="lab-nav__links">
        {manifestSibling && (
          <Link to={`/lab/${manifestSibling.configId}`} className="lab-nav__link">
            Setup
          </Link>
        )}
        {customerSibling && (
          <Link to={`/lab/${customerSibling.configId}`} className="lab-nav__link">
            Customer journey
          </Link>
        )}
        <Link to="/demo/device/puk2" className="lab-nav__link lab-nav__link--muted">
          PUK mock
        </Link>
      </div>
    </nav>
  );
}
