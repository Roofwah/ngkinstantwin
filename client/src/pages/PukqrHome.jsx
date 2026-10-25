import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './pukqr.css';

function usePukqrTitle(title, description) {
  useEffect(() => {
    const previousTitle = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.getAttribute('content') || '';
    document.title = title;
    if (meta) meta.setAttribute('content', description);
    return () => {
      document.title = previousTitle;
      if (meta) meta.setAttribute('content', previousDescription);
    };
  }, [title, description]);
}

export function PukqrFooter() {
  return (
    <footer className="pukqr__footer">
      <div className="pukqr__footer-top">
        <div className="pukqr__footer-brand">
          <img className="pukqr__footer-logo" src="/puk/puk-logo.png" alt="" />
          <div className="pukqr__footer-tag">Purchase. Scan. Win.</div>
        </div>
        <nav className="pukqr__footer-links" aria-label="Footer">
          <a href="/#register">Register Interest</a>
          <Link to="/privacy">Privacy Policy</Link>
          <span className="pukqr__regions">AU/NZ | USA | UK</span>
        </nav>
      </div>
      <div className="pukqr__legal">
        <div>© 2026 Flow MKTG. All rights reserved.</div>
        <div>Flow Marketing Pty Ltd (Australia)</div>
        <div>Flow Marketing LLC (USA)</div>
      </div>
    </footer>
  );
}

export default function PukqrHome() {
  const [notice, setNotice] = useState('');

  usePukqrTitle(
    'PUKQR.com',
    'Instant win at point of purchase. PUK turns instant win into a visible, shared retail experience.',
  );

  function onSubmit(event) {
    event.preventDefault();
    setNotice('Registration is not open yet. Email delivery has not been configured.');
  }

  return (
    <div className="pukqr">
      <main className="pukqr__main">
        <div className="pukqr__hero">
          <img className="pukqr__logo" src="/puk/puk-logo.png" alt="PUK" />
          <div className="pukqr__intro">
            <p className="pukqr__domain">PUKQR.com</p>
            <h1 className="pukqr__headline">Instant win at point of purchase.</h1>
            <p className="pukqr__lead">
              PUK turns instant win into a visible, shared retail experience, giving
              customers another reason to choose, staff a powerful selling tool, and brands
              a way to drive sales without relying on discounting.
            </p>
          </div>
        </div>

        <section className="pukqr__form" id="register">
          <div className="pukqr__form-copy">
            <h2>Register your interest</h2>
            <p>Tell us who you are. We’ll come back to you about PUK.</p>
          </div>
          <form className="pukqr__fields" onSubmit={onSubmit}>
            <div className="pukqr__row">
              <label>
                Name
                <input name="name" type="text" autoComplete="name" required />
              </label>
              <label>
                Company
                <input name="company" type="text" autoComplete="organization" required />
              </label>
            </div>
            <label>
              Email address
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <button className="pukqr__submit" type="submit">Register Interest</button>
          </form>
          {notice ? <p className="pukqr__note" role="status">{notice}</p> : null}
        </section>
      </main>
      <PukqrFooter />
    </div>
  );
}
