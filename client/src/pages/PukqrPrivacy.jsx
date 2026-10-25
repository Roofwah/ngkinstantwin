import { Link } from 'react-router-dom';
import { PukqrFooter } from './PukqrHome';
import './pukqr.css';
import { useEffect } from 'react';

export default function PukqrPrivacy() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Privacy Policy — PUKQR.com';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="pukqr">
      <main className="pukqr__main pukqr__privacy">
        <p className="pukqr__domain"><Link to="/">PUKQR.com</Link></p>
        <h1>Privacy Policy</h1>
        <p>
          This policy describes how Flow MKTG handles information submitted through the
          registration form on PUKQR.com.
        </p>

        <section>
          <h2>Information collected</h2>
          <p>
            The registration form asks for your name, company, and email address. That is
            the information the form is designed to collect.
          </p>
        </section>

        <section>
          <h2>Why it is collected</h2>
          <p>
            The details are used to respond to an enquiry about PUK and to keep a record of
            that conversation. They are not collected for a separate marketing list through
            this form.
          </p>
        </section>

        <section>
          <h2>How enquiries are handled</h2>
          <p>
            Enquiries are intended for the Flow MKTG team. The form on this site is not
            sending messages yet, because email delivery has not been configured. Until it
            is, nothing you type into the form is stored or transmitted.
          </p>
        </section>

        <section>
          <h2>Retention</h2>
          <p>
            When delivery is switched on, enquiry records will be kept only for as long as
            they are needed to respond and to keep a reasonable record of the exchange, then
            deleted or de-identified.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Privacy enquiries: <a href="mailto:hello@flowmarketing.co">hello@flowmarketing.co</a>.
            This address is the proposed contact and is subject to confirmation.
          </p>
        </section>
      </main>
      <PukqrFooter />
    </div>
  );
}
