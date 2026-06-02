import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  useEffect(() => {
    if (localStorage.getItem('adminToken')) navigate('/admin/dashboard');
  }, [navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      localStorage.setItem('adminToken', password);
      await adminLogin(password);
      navigate('/admin/dashboard');
    } catch {
      localStorage.removeItem('adminToken');
      setError('Invalid password. Check ADMIN_PASSWORD in your .env file.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '16px' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 8 }}>
            PureRandom Instant Win
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700 }}>
            Admin Dashboard
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-3)', marginTop: 6 }}>
            Repco Rewards × NGK / NTK / KYB
          </p>
        </div>

        <div className="card">
          {error && <div className="alert alert--error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter ADMIN_PASSWORD"
                autoFocus
              />
            </div>

            <button type="submit" className="btn btn--primary btn--full" disabled={loading || !password}>
              {loading ? <><span className="spinner" /> Verifying…</> : 'Enter Dashboard'}
            </button>
          </form>

          <p style={{ fontSize: '0.72rem', color: 'var(--text-3)', textAlign: 'center', marginTop: 16 }}>
            Default password: <code style={{ color: 'var(--amber)' }}>changeme</code> — set ADMIN_PASSWORD in .env
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16 }}>
          <a href="/" style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>← Back to Campaign</a>
        </p>
      </div>
    </div>
  );
}
