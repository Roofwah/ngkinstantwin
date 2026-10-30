const db = require('../db');
const { log } = require('./auditLogger');
const { sendBirdSms } = require('../lib/birdSms');
const { getBaseUrl, getLanIpv4 } = require('../lib/baseUrl');
const { HOKA_STORE_NAME, maskMobile } = require('../lib/hokaCampaign');
const {
  NITERRA_CAMPAIGN_ID,
  NITERRA_STORE_NAME,
  NITERRA_EMAIL_HERO_PATH,
  NITERRA_LAYOUT_MAX_PX,
  niterraPrizeImagePath,
} = require('../lib/niterraCampaign');
const { AUDI_CAMPAIGN_ID, AUDI_STORE_NAME, audiPrizeImagePath, isAudiVerificationMethod } = require('../lib/audiCampaign');
const { ensureWinnerRedemption, redemptionStatusLabel } = require('./redemption');
const { customerQrSettings, armRedemptionWindow } = require('../lib/customerQr');

function isNiterraClaim(claim) {
  if (!claim) return false;
  if (claim.campaignId === NITERRA_CAMPAIGN_ID) return true;
  return claim.verificationMethod === 'niterra_crossword';
}

function isAudiClaim(claim) {
  if (!claim) return false;
  if (claim.campaignId === AUDI_CAMPAIGN_ID) return true;
  return isAudiVerificationMethod(claim.verificationMethod);
}

function emailKicker(brand) {
  const raw = String(brand || 'PUK').trim();
  const upper = raw.toUpperCase();
  if (upper.includes('INSTANT WIN')) return upper;
  return `${upper} INSTANT WIN`;
}

function winnerEmailBranding(claim) {
  const qr = customerQrSettings(claim);
  if (qr) {
    const store = claim.storeName || qr.storeName;
    return {
      kicker: emailKicker(qr.brand || 'PUK'),
      title: 'Instant Winner',
      subject: `${store} — Instant Winner`,
      accent: qr.theme.accent,
      buttonText: '#ffffff',
      defaultStore: qr.storeName || store,
    };
  }
  if (isAudiClaim(claim)) {
    const store = claim.storeName || AUDI_STORE_NAME;
    return {
      kicker: 'AUDI INSTANT WIN',
      title: 'Instant Winner',
      subject: `${store} — Instant Winner`,
      accent: '#bb0a30',
      buttonText: '#ffffff',
      defaultStore: AUDI_STORE_NAME,
    };
  }
  if (isNiterraClaim(claim)) {
    const store = claim.storeName || NITERRA_STORE_NAME;
    return {
      kicker: 'NITERRA INSTANT WIN',
      title: 'Instant Winner',
      subject: `${store} — Instant Winner`,
      accent: '#e31837',
      buttonText: '#ffffff',
      defaultStore: NITERRA_STORE_NAME,
    };
  }
  if (claim?.campaignId === 'hoka-2026') {
    const store = claim.storeName || HOKA_STORE_NAME;
    return {
      kicker: 'HOKA INSTANT WIN',
      title: 'Instant Winner',
      subject: `${store} — Instant Winner`,
      accent: '#dfff00',
      buttonText: '#0a1628',
      defaultStore: HOKA_STORE_NAME,
    };
  }
  const store = claim?.storeName || 'Demo Store';
  return {
    kicker: 'PUK INSTANT WIN',
    title: 'Instant Winner',
    subject: `${store} — Instant Winner`,
    accent: '#d48c48',
    buttonText: '#ffffff',
    defaultStore: 'Demo Store',
  };
}

function firstName(fullName) {
  return String(fullName || 'there').trim().split(/\s+/)[0] || 'there';
}

function claimPrizeValue(claim) {
  if (!claim?.prizeId) return null;
  const row = db.prepare('SELECT value FROM manifest WHERE prizeId = ?').get(claim.prizeId);
  const value = Number(row?.value);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function audiPrizeLabel(claim) {
  const value = claimPrizeValue(claim);
  if (value) return `$${value} Audi service or accessories voucher`;
  return claim.prizeName || 'Audi service or accessories voucher';
}

function winnerSmsBody(claim) {
  const qr = customerQrSettings(claim);
  if (qr) {
    const store = claim.storeName || qr.storeName;
    const url = winnerPageUrl(claim);
    return [
      `Congratulations ${firstName(claim.customerName)}!`,
      ``,
      `You've won ${claim.prizeName} at ${store}!`,
      ``,
      `Redeem your prize within ${qr.minutes} minutes.`,
      ``,
      `Show your winning QR code to staff:`,
      ``,
      url,
      ``,
      `Redemption code: ${claim.redemptionCode}`,
    ].join('\n');
  }

  const store = claim.storeName
    || (isAudiClaim(claim) ? AUDI_STORE_NAME : isNiterraClaim(claim) ? NITERRA_STORE_NAME : HOKA_STORE_NAME);
  const prizeLine = isAudiClaim(claim)
    ? `You've won ${audiPrizeLabel(claim)} at ${store}.`
    : `You've won ${claim.prizeName} at ${store}.`;
  return [
    `Congratulations ${firstName(claim.customerName)}!`,
    ``,
    prizeLine,
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
  if (!claim?.fulfilmentToken) return null;
  return `${appBaseUrl()}/fulfil/${claim.fulfilmentToken}`;
}

function winnerPageUrl(claim) {
  if (!claim?.fulfilmentToken) return null;
  return `${appBaseUrl()}/win/${claim.fulfilmentToken}`;
}

function fulfilButtonBlock(url, branding) {
  const safeUrl = escapeHtml(url);
  const accent = branding?.accent || '#dfff00';
  const textColor = branding?.buttonText || '#0a1628';
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto 12px;">
      <tr>
        <td align="center" bgcolor="${accent}" style="border-radius:8px;">
          <a href="${safeUrl}" target="_blank" rel="noopener noreferrer"
             style="display:inline-block;padding:14px 32px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.08em;color:${textColor};text-decoration:none;background:${accent};border-radius:8px;">
            FULFIL PRIZE
          </a>
        </td>
      </tr>
    </table>
    <p style="font-size:12px;color:#9aa6b8;text-align:center;margin:0 0 8px;">
      Tap the button to open the staff fulfilment page, or use this link:
    </p>
    <p style="font-size:12px;text-align:center;margin:0 0 8px;word-break:break-all;">
      <a href="${safeUrl}" style="color:${accent};text-decoration:underline;">${safeUrl}</a>
    </p>
    <p style="font-size:12px;color:#9aa6b8;text-align:center;margin:0;">
      The button opens the fulfilment page. It does not mark the prize fulfilled.
    </p>`;
}

function winnerEmailText(claim) {
  const url = fulfilUrl(claim);
  const branding = winnerEmailBranding(claim);
  const store = claim.storeName || branding.defaultStore;
  const status = redemptionStatusLabel(claim.redemptionStatus);
  const lines = [
    `${branding.kicker} — ${branding.title}`,
    '',
    `Store: ${store}`,
    `Winner: ${claim.customerName || '—'}`,
    `Mobile: ${maskMobile(claim.mobile)}`,
  ];
  if (isAudiClaim(claim)) {
    lines.push(`Model: ${claim.selectedBrand || '—'}`);
    lines.push(`Contract (last 4 digits): ${claim.receiptNumber || '—'}`);
  } else {
    const value = Number(claim.spendAmount || 0).toFixed(2);
    lines.push(`Purchase: ${claim.selectedBrand || '—'}`);
    lines.push(`Purchase Value: $${value}`);
  }
  lines.push(
    `Prize: ${isAudiClaim(claim) ? audiPrizeLabel(claim) : (claim.prizeName || '—')}`,
    `Redemption Code: ${claim.redemptionCode || '—'}`,
    `Status: ${status}`,
    '',
  );
  if (url) {
    lines.push('FULFIL PRIZE:', url, '');
    lines.push('Open the link above to confirm fulfilment on the staff page.');
  }
  return lines.join('\n');
}

function prizeImageBlock(claim) {
  let assetPath = null;
  if (isNiterraClaim(claim)) assetPath = niterraPrizeImagePath(claim.prizeName);
  else if (isAudiClaim(claim)) assetPath = audiPrizeImagePath(claim.prizeName);
  if (!assetPath) return '';
  const src = `${appBaseUrl()}${assetPath}`;
  const alt = escapeHtml(claim.prizeName || 'Prize');
  return `
    <div style="text-align:center;margin:0 0 20px;">
      <img src="${escapeHtml(src)}" alt="${alt}" width="200" style="max-width:200px;height:auto;display:inline-block;" />
    </div>`;
}

function winnerEmailHtml(claim) {
  const url = fulfilUrl(claim);
  const branding = winnerEmailBranding(claim);
  const store = claim.storeName || branding.defaultStore;
  const status = redemptionStatusLabel(claim.redemptionStatus);
  const purchaseRows = isAudiClaim(claim)
    ? `${row('Model', claim.selectedBrand || '—')}${row('Contract (last 4 digits)', claim.receiptNumber || '—')}`
    : `${row('Purchase', claim.selectedBrand || '—')}${row('Purchase Value', `$${Number(claim.spendAmount || 0).toFixed(2)}`)}`;
  const inner = `
    <p style="letter-spacing:0.14em;font-size:12px;color:${branding.accent};margin:0 0 8px;">${escapeHtml(branding.kicker)}</p>
    <h1 style="margin:0 0 20px;font-size:22px;">${escapeHtml(branding.title)}</h1>
    ${prizeImageBlock(claim)}
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:#f4f1ea;">
      ${row('Store', store)}
      ${row('Winner', claim.customerName || '—')}
      ${row('Mobile', maskMobile(claim.mobile))}
      ${purchaseRows}
      ${row('Prize', isAudiClaim(claim) ? audiPrizeLabel(claim) : (claim.prizeName || '—'))}
      ${row('Redemption Code', claim.redemptionCode || '—')}
      ${row('Status', status)}
    </table>
    ${url ? fulfilButtonBlock(url, branding) : '<p style="color:#ff8a80;text-align:center;">Fulfilment link unavailable — contact support.</p>'}`;

  if (isNiterraClaim(claim)) {
    const hero = escapeHtml(`${appBaseUrl()}${NITERRA_EMAIL_HERO_PATH}`);
    const niterraCol = NITERRA_LAYOUT_MAX_PX;
    return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#000000;font-family:Arial,sans-serif;color:#f4f1ea;">
  <div style="max-width:${niterraCol}px;margin:0 auto;background:#000000;">
    <img src="${hero}" alt="Niterra Instant Win" width="${niterraCol}"
         style="width:100%;max-width:${niterraCol}px;height:auto;display:block;border:0;vertical-align:top;" />
    <div style="padding:20px 18px 28px;background:rgba(0,0,0,0.94);border-top:1px solid rgba(227,24,55,0.35);">
      ${inner}
    </div>
  </div>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#0a1628;font-family:Arial,sans-serif;color:#f4f1ea;">
  <div style="max-width:560px;margin:0 auto;background:#102038;border-radius:12px;padding:28px;">
    ${inner}
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

/** Railway/dotenv often store `"value"` with quotes — Resend rejects that From. */
function envVal(name, fallback = '') {
  const raw = process.env[name];
  const s = (raw == null || raw === '' ? fallback : String(raw)).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).trim();
  }
  return s;
}

function resendConfigured() {
  return Boolean(envVal('RESEND_API_KEY'));
}

/** Lab journey and store preview — never surface skipped/demo/pending to staff. */
function publicNotifyStatus(status) {
  return status === 'failed' ? 'failed' : 'sent';
}

async function sendWinnerEmail(claim) {
  const apiKey = envVal('RESEND_API_KEY');
  const to = envVal('WINNER_NOTIFY_EMAIL', 'chris@flowmarketing.com.au');
  const from = envVal('RESEND_FROM', 'PUK Instant Win <onboarding@resend.dev>');
  const branding = winnerEmailBranding(claim);

  if (!apiKey) {
    console.warn(`[resend] RESEND_API_KEY not set — would email ${to} for ${claim.claimId}`);
    return { ok: false, skipped: true, error: 'Resend not configured' };
  }

  console.log(`[resend] sending winner email for ${claim.claimId} from ${from} to ${to}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: branding.subject,
        html: winnerEmailHtml(claim),
        text: winnerEmailText(claim),
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const error = err.name === 'AbortError' ? 'Resend timed out' : err.message;
    console.error(`[resend] ${error} for ${claim.claimId}`);
    return { ok: false, skipped: false, error };
  }
  clearTimeout(timer);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data.message || data.error || `Resend HTTP ${response.status}`;
    console.error(`[resend] failed for ${claim.claimId}: ${error}`, data);
    return { ok: false, skipped: false, error };
  }
  console.log(`[resend] sent ${data.id || 'ok'} for ${claim.claimId}`);
  return { ok: true, skipped: false };
}

async function notifyHokaWinner(claimId) {
  let claim;
  try {
    claim = ensureWinnerRedemption(claimId);
  } catch (err) {
    console.error(`[hoka] redemption ensure failed for ${claimId}:`, err.message);
    return;
  }

  if (!claim || !claim.redemptionCode || !claim.fulfilmentToken) {
    console.warn(`[hoka] skip winner notify — missing claim or fulfilment link (${claimId})`);
    return;
  }

  if (customerQrSettings(claim)) {
    claim = armRedemptionWindow(claim);
  }

  let smsStatus = 'failed';
  let emailStatus = 'failed';
  const errors = [];

  const [smsResult, emailResult] = await Promise.allSettled([
    sendBirdSms(claim.mobile, winnerSmsBody(claim), { required: true }),
    sendWinnerEmail(claim),
  ]);

  if (smsResult.status === 'fulfilled') {
    const sms = smsResult.value;
    smsStatus = publicNotifyStatus(
      sms.ok || sms.skipped || sms.demo ? 'sent' : 'failed',
    );
    if (!sms.ok && !sms.skipped && !sms.demo) errors.push(`sms: ${sms.error}`);
  } else {
    errors.push(`sms: ${smsResult.reason?.message || smsResult.reason}`);
  }

  if (emailResult.status === 'fulfilled') {
    const email = emailResult.value;
    emailStatus = publicNotifyStatus(
      email.ok || email.skipped ? 'sent' : 'failed',
    );
    if (!email.ok && !email.skipped) errors.push(`email: ${email.error}`);
  } else {
    errors.push(`email: ${emailResult.reason?.message || emailResult.reason}`);
  }

  db.prepare(`
    UPDATE claims SET winnerSmsStatus = ?, winnerEmailStatus = ? WHERE claimId = ?
  `).run(smsStatus, emailStatus, claimId);

  log('instant_winner_notify', {
    claimId,
    details: {
      campaignId: claim.campaignId,
      smsStatus,
      emailStatus,
      error: errors.join('; ') || undefined,
      redemptionCode: claim.redemptionCode,
      fulfilmentUrl: fulfilUrl(claim),
    },
  });

  if (errors.length) {
    console.error(`[winner-notify] incomplete for ${claimId}: ${errors.join('; ')}`);
  }

  try {
    const { notifyStoreEmailSent } = require('./labSession');
    notifyStoreEmailSent(claimId, { emailStatus });
  } catch (err) {
    console.warn(`[hoka] lab store-email stage skipped for ${claimId}:`, err.message);
  }
}

function notifyHokaWinnerSafe(claimId) {
  setImmediate(() => {
    notifyHokaWinner(claimId).catch((err) => {
      console.error(`[winner-notify] crashed for ${claimId}:`, err.message);
      log('instant_winner_notify_failed', {
        claimId,
        details: { error: err.message },
      });
    });
  });
}

function getStoreEmailPreview(claim) {
  if (!claim || claim.result === 'NOT_WINNER') return null;

  let row = claim;
  if (!row.redemptionCode || !row.fulfilmentToken) {
    try {
      row = ensureWinnerRedemption(row.claimId);
    } catch {
      return null;
    }
  }

  const branding = winnerEmailBranding(row);

  return {
    subject: branding.subject,
    to: envVal('WINNER_NOTIFY_EMAIL', 'chris@flowmarketing.com.au'),
    kicker: branding.kicker,
    html: winnerEmailHtml(row),
    text: winnerEmailText(row),
    emailStatus: publicNotifyStatus(row.winnerEmailStatus),
    fulfilmentUrl: fulfilUrl(row),
    redemptionCode: row.redemptionCode || null,
  };
}

module.exports = {
  notifyHokaWinner,
  notifyHokaWinnerSafe,
  winnerSmsBody,
  winnerEmailHtml,
  winnerEmailText,
  getStoreEmailPreview,
  resendConfigured,
  appBaseUrl,
  winnerPageUrl,
  fulfilUrl,
};
