import { useEffect, useState } from 'react';
import { completeFulfilment, getFulfilment } from '../api';
import '../campaigns/smirnoff.css';

function formatClock(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

function formatElapsed(ms) {
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 1) return 'less than 1 minute';
  if (mins === 1) return '1 minute';
  return `${mins} minutes`;
}

export default function CustomerQrFulfilPanel({ token, initial }) {
  const [data, setData] = useState(initial);
  const [receivedAt, setReceivedAt] = useState(Date.now());
  const [tick, setTick] = useState(Date.now());
  const [staffName, setStaffName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    setData(initial);
    setReceivedAt(Date.now());
  }, [initial]);

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      getFulfilment(token)
        .then((next) => {
          setData(next);
          setReceivedAt(Date.now());
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, [token]);

  const theme = data?.theme || {};
  const style = {
    background: theme.background || '#000000',
    color: theme.text || '#ffffff',
    '--sm-red': theme.accent || '#E10600',
    '--sm-bg': theme.background || '#000000',
    '--sm-text': theme.text || '#ffffff',
  };

  const estimatedNow = (data?.serverNow || Date.now()) + (tick - receivedAt);
  const closed = data?.status === 'FULFILLED' || data?.status === 'SHIP_TO_STORE';
  const expired = !closed && (data?.expired || (data?.redemptionExpiresAt && estimatedNow >= data.redemptionExpiresAt));
  const elapsedFrom = data?.pukQrGeneratedAt || data?.prizeAwardedAt;
  const elapsedLabel = data?.pukQrGeneratedAt ? 'Time elapsed' : 'Time since prize awarded';

  async function confirm(overrideExpired) {
    setSaving(true);
    setError('');
    try {
      const next = await completeFulfilment(token, staffName, 'fulfilled', { overrideExpired });
      setData(next);
      setReceivedAt(Date.now());
      setDeclined(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const staffOk = staffName.trim().length >= 2;

  return (
    <div className="smirnoff-page smirnoff-staff" style={style}>
      <div className="smirnoff-wrap">
        <p className="smirnoff-kicker">{String(data?.brand || 'Prize').toUpperCase()}</p>
        <h1 className="smirnoff-title">
          {closed ? 'Redeemed' : 'Verify winning purchase'}
        </h1>

        {error && <div className="smirnoff-error" role="alert">{error}</div>}

        {closed && <div className="smirnoff-banner smirnoff-banner--ok">REDEEMED</div>}
        {!closed && expired && (
          <>
            <div className="smirnoff-banner">REDEMPTION WINDOW EXPIRED</div>
            <p className="smirnoff-lede">Please request proof of purchase before proceeding.</p>
          </>
        )}
        {!closed && !expired && <div className="smirnoff-banner smirnoff-banner--ok">VALIDATION PASSED</div>}

        <div>
          <div className="smirnoff-row"><span>Venue</span><strong>{data?.storeName}</strong></div>
          <div className="smirnoff-row"><span>Winner</span><strong>{data?.winner}</strong></div>
          <div className="smirnoff-row"><span>Prize</span><strong>{data?.prize}</strong></div>
          <div className="smirnoff-row"><span>Redemption code</span><strong>{data?.redemptionCode}</strong></div>
          {data?.pukQrGeneratedAt && (
            <div className="smirnoff-row">
              <span>Original PUK QR generated</span>
              <strong>{formatClock(data.pukQrGeneratedAt)}</strong>
            </div>
          )}
          <div className="smirnoff-row">
            <span>Prize awarded</span>
            <strong>{formatClock(data?.prizeAwardedAt)}</strong>
          </div>
          <div className="smirnoff-row">
            <span>Current time</span>
            <strong>{formatClock(estimatedNow)}</strong>
          </div>
          {elapsedFrom && (
            <div className="smirnoff-row">
              <span>{elapsedLabel}</span>
              <strong>{formatElapsed(estimatedNow - elapsedFrom)}</strong>
            </div>
          )}
          {data?.eligiblePurchaseWindow && (
            <div className="smirnoff-row">
              <span>Eligible purchase window</span>
              <strong>
                {formatClock(data.eligiblePurchaseWindow.start)}–{formatClock(data.eligiblePurchaseWindow.end)}
              </strong>
            </div>
          )}
          {closed && (
            <>
              <div className="smirnoff-row">
                <span>Redeemed</span>
                <strong>{formatClock(data?.fulfilledAt)}</strong>
              </div>
              <div className="smirnoff-row">
                <span>Confirmed by</span>
                <strong>{data?.fulfilledBy || '—'}</strong>
              </div>
              {data?.redeemedAfterExpiry && (
                <div className="smirnoff-row">
                  <span>Window</span>
                  <strong>Redeemed after expiry</strong>
                </div>
              )}
            </>
          )}
        </div>

        {!closed && declined && (
          <p className="smirnoff-lede">Redemption declined. The prize has not been fulfilled.</p>
        )}

        {!closed && !declined && (
          <>
            <div className="smirnoff-field">
              <label htmlFor="smirnoff-staff-name">Staff name</label>
              <input
                id="smirnoff-staff-name"
                type="text"
                autoComplete="name"
                placeholder="Staff name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
              />
            </div>
            <div className="smirnoff-actions">
              {!expired && (
                <button className="smirnoff-cta" type="button" disabled={!staffOk || saving} onClick={() => confirm(false)}>
                  {saving ? 'Saving…' : 'Confirm redemption'}
                </button>
              )}
              {expired && (
                <>
                  <button className="smirnoff-cta" type="button" disabled={!staffOk || saving} onClick={() => confirm(true)}>
                    {saving ? 'Saving…' : 'Verify & redeem'}
                  </button>
                  <button className="smirnoff-ghost" type="button" onClick={() => setDeclined(true)}>
                    Decline redemption
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
