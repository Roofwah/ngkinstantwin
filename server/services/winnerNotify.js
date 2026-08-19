const db = require('../db');
const { log } = require('./auditLogger');
const { sendBirdSms } = require('../lib/birdSms');
const { getBaseUrl, getLanIpv4 } = require('../lib/baseUrl');
const { HOKA_STORE_NAME, maskMobile } = require('../lib/hokaCampaign');

function firstName(fullName) {
  return String(fullName || 'there').trim().split(/\s+/)[0] || 'there';
}

function winnerSmsBody(claim) {
  const store = claim.storeName || HOKA_STORE_NAME;
  return [
    `Congratulations ${firstName(claim.customerName)}!`,
    ``,
    `You've won ${claim.prizeName} at ${store}.`,
    ``,
    `Show this message to a staff member to redeem your prize.`,
    ``,
    `Redemption code:`,
    claim.redemptionCode,
  ].join('\n');
}

function appBaseUrl() {
  if ((process.env.PUBLIC_APP_URL || '').trim()) {
    return process.env.PUBLIC_APP_URL.trim().replace(/\/$/, '');
  }
  if (process.env.NODE_ENV !== 'production') {
    const lan = getLanIpv4();
    const port = process.env.CLIENT_DEV_PORT || '5173';
    return `http://${lan || 'localhost'}:${port}`;
  }
  return getBaseUrl();
}

function fulfilUrl(claim) {
  return `${appBaseUrl()}/fulfil/${claim.fulfilmentToken}`;
}

function winnerEmailHtml(claim) {
  const url = fulfilUrl(claim);
  const value = Number(claim.spendAmount || 0).toFixed(2);
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#0a1628;font-family:Arial,sans-serif;color:#f4f1ea;">
  <div style="max-width:560px;margin:0 auto;background:#102038;border-radius:12px;padding:28px;">
    <p style="letter-spacing:0.14em;font-size:12px;color:#dfff00;margin:0 0 8px;">COTSWOLD OUTDOOR × HOKA</p>
    <h1 style="margin:0 0 20px;font-size:22px;">Instant Winner</h1>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#f4f1ea;">
      ${row('Store', claim.storeName || HOKA_STORE_NAME)}
      ${row('Winner', claim.customerName || '—')}
      ${row('Mobile', maskMobile(claim.mobile))}
      ${row('Purchase', claim.selectedBrand || '—')}
      ${row('Purchase Value', `$${value}`)}
      ${row('Prize', claim.prizeName || '—')}
      ${row('Redemption Code', claim.redemptionCode || '—')}
      ${row('Status', 'AWAITING FULFILMENT')}
    </table>
    <p style="text-align:center;margin:28px 0 8px;">
      <a href="${url}" style="display:inline-block;background:#dfff00;color:#0a1628;text-decoration:none;font-weight:700;letter-spacing:0.08em;padding:14px 28px;border-radius:8px;">FULFIL PRIZE</a>
    </p>
    <p style="font-size:12px;color:#9aa6b8;text-align:center;">This button opens the fulfilment page. It does not mark the prize fulfilled.</p>
  </div>
</body>
</html>`;
}

function row(label, value) {
  return `<tr>
    <td style="padding:8px 0;border-bottom:1px solid #1c3354;color:#9aa6b8;width:42%;">${label}</td>
    <td style="padding:8px 0;border-bottom:1px solid #1c3354;font-weight:600;">${escapeHtml(value)}</td>
  </tr>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendWinnerEmail(claim) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const to = (process.env.WINNER_NOTIFY_EMAIL || 'chris@flowmarketing.com.au').trim();
  const from = (process.env.RESEND_FROM || 'Cotswold Instant Win <onboarding@resend.dev>').trim();

  if (!apiKey) {
    console.warn(`[resend] RESEND_API_KEY not set — would email ${to} for ${claim.claimId}`);
    return { ok: false, skipped: true, error: 'Resend not configured' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Cotswold Birmingham — Instant Winner',
      html: winnerEmailHtml(claim),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data.message || data.error || `Resend HTTP ${response.status}`;
    return { ok: false, skipped: false, error };
  }
  return { ok: true, skipped: false };
}

async function notifyHokaWinner(claimId) {
  const claim = db.prepare('SELECT * FROM claims WHERE claimId = ?').get(claimId);
  if (!claim || !claim.redemptionCode) return;

  let smsStatus = 'failed';
  let emailStatus = 'failed';
  const errors = [];

  try {
    const sms = await sendBirdSms(claim.mobile, winnerSmsBody(claim), { required: true });
    smsStatus = sms.ok ? (sms.demo || sms.skipped ? 'skipped' : 'sent') : (sms.skipped ? 'skipped' : 'failed');
    if (!sms.ok) errors.push(`sms: ${sms.error}`);
  } catch (err) {
    errors.push(`sms: ${err.message}`);
  }

  try {
    const email = await sendWinnerEmail(claim);
    emailStatus = email.ok ? 'sent' : (email.skipped ? 'skipped' : 'failed');
    if (!email.ok) errors.push(`email: ${email.error}`);
  } catch (err) {
    errors.push(`email: ${err.message}`);
  }

  db.prepare(`
    UPDATE claims SET winnerSmsStatus = ?, winnerEmailStatus = ? WHERE claimId = ?
  `).run(smsStatus, emailStatus, claimId);

  log('hoka_winner_notify', {
    claimId,
    details: {
      smsStatus,
      emailStatus,
      error: errors.join('; ') || undefined,
      redemptionCode: claim.redemptionCode,
    },
  });

  if (errors.length) {
    console.error(`[hoka] winner notify incomplete for ${claimId}: ${errors.join('; ')}`);
  }
}

function notifyHokaWinnerSafe(claimId) {
  setImmediate(() => {
    notifyHokaWinner(claimId).catch((err) => {
      console.error(`[hoka] winner notify crashed for ${claimId}:`, err.message);
      log('hoka_winner_notify_failed', {
        claimId,
        details: { error: err.message },
      });
    });
  });
}

module.exports = { notifyHokaWinner, notifyHokaWinnerSafe, winnerSmsBody };
