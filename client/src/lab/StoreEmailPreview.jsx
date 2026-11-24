function statusLabel(status) {
  if (status === 'failed') return 'Send failed';
  return 'Sent to store';
}

/** srcDoc iframes cannot load LAN API URLs — point campaign assets at this dev server. */
function labEmailPreviewHtml(html) {
  if (!html || typeof window === 'undefined') return html;
  const origin = window.location.origin.replace(/\/$/, '');
  let out = html.replace(
    /src="https?:\/\/[^"]*(\/(?:campaigns|uploads)\/[^"]+)"/gi,
    `src="${origin}$1"`,
  );
  const base = `<base href="${origin}/">`;
  if (/<head[\s>]/i.test(out)) {
    out = out.replace(/<head(\s[^>]*)?>/i, (m) => `${m}${base}`);
  } else {
    out = out.replace(/<html(\s[^>]*)?>/i, (m) => `${m}<head>${base}</head>`);
  }
  return out;
}

/** Inbox-style preview of the instant-winner email sent to the store. */
export default function StoreEmailPreview({ email, compact = false }) {
  if (!email?.html) return null;

  const srcDoc = labEmailPreviewHtml(email.html);

  return (
    <div className={`lab-store-email${compact ? ' lab-store-email--compact' : ''}`}>
      <div className="lab-store-email__envelope">
        <div className="lab-store-email__meta-row">
          <span className="lab-store-email__meta-label">To</span>
          <span className="lab-store-email__meta-value">{email.to}</span>
        </div>
        <div className="lab-store-email__meta-row">
          <span className="lab-store-email__meta-label">Subject</span>
          <span className="lab-store-email__meta-value">{email.subject}</span>
        </div>
        <span className={`lab-store-email__status lab-store-email__status--${email.emailStatus === 'failed' ? 'failed' : 'sent'}`}>
          {statusLabel(email.emailStatus)}
        </span>
      </div>

      <div className="lab-store-email__preview">
        <iframe
          className="lab-store-email__iframe"
          title="Store notification email"
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          srcDoc={srcDoc}
        />
      </div>

      {!compact && email.fulfilmentUrl && (
        <p className="lab-store-email__footnote">
          Fulfil link in email opens the staff confirmation page for this prize.
        </p>
      )}
    </div>
  );
}
