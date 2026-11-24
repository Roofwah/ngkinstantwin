import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { getWinnerPage } from '../api';
import '../campaigns/smirnoff.css';

function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function serverNowEstimate(data, receivedAt) {
  if (!data?.serverNow || !receivedAt) return Date.now();
  return data.serverNow + (Date.now() - receivedAt);
}

export default function WinPrize() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const next = await getWinnerPage(token);
        if (cancelled) return;
        setData(next);
        setReceivedAt(Date.now());
        setError('');
      } catch (err) {
        if (!cancelled) setError(err.message || 'Winning record not found');
      }
    }

    load();
    const poll = setInterval(load, 3000);
    const tick = setInterval(() => setNow(Date.now()), 250);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [token]);

  const theme = data?.theme || {};
  const style = {
    background: theme.background || '#000000',
    color: theme.text || '#ffffff',
    '--sm-red': theme.accent || '#E10600',
    '--sm-bg': theme.background || '#000000',
    '--sm-text': theme.text || '#ffffff',
  };

  const estimated = data ? serverNowEstimate(data, receivedAt) : now;
  const remaining = data?.expiresAt ? data.expiresAt - estimated : null;
  const expired = Boolean(data?.redeemed) ? false : Boolean(data?.expired) || (remaining != null && remaining <= 0);
  const showQr = Boolean(data?.qrAvailable && data?.staffScanUrl);
  const store = data?.storeName || '';

  return (
    <div className="smirnoff-page" style={style}>
      <div className="smirnoff-wrap smirnoff-win">
        {error && !data && <div className="smirnoff-error" role="alert">{error}</div>}
        {!data && !error && <p className="smirnoff-lede">Loading…</p>}
        {data && (
          <>
            <p className="smirnoff-kicker">{String(data.brand || '').toUpperCase()}</p>
            {data.redeemed ? (
              <div className="smirnoff-banner smirnoff-banner--ok">REDEEMED</div>
            ) : expired ? (
              <>
                <div className="smirnoff-banner">REDEMPTION EXPIRED</div>
                <h1 className="smirnoff-title">Your standard redemption period has ended.</h1>
                <p className="smirnoff-lede">Please speak to staff at {store}.</p>
              </>
            ) : (
              <>
                <h1 className="smirnoff-title">Congratulations!</h1>
                <p className="smirnoff-prize">You&apos;re a winner!</p>
              </>
            )}

            <p className="smirnoff-lede">You&apos;ve won:</p>
            <p className="smirnoff-prize">{data.prize}</p>
            {showQr && (
              <>
                <p className="smirnoff-lede">Present this QR code to staff at:</p>
                <p className="smirnoff-store">{store}</p>
              </>
            )}
            {!showQr && <p className="smirnoff-store">{store}</p>}

            {showQr && (
              <div className="smirnoff-qr" aria-label="Winning QR code for staff">
                <QRCodeSVG value={data.staffScanUrl} size={220} includeMargin />
              </div>
            )}

            {!data.redeemed && (
              <>
                <p className="smirnoff-timer">Time remaining</p>
                <p className="smirnoff-clock" aria-live="polite">
                  {remaining == null ? '—' : formatCountdown(remaining)}
                </p>
              </>
            )}

            {data.redemptionCode && (
              <div>
                <span className="smirnoff-code-label">Redemption code</span>
                <div className="smirnoff-code">{data.redemptionCode}</div>
              </div>
            )}
            <p className="smirnoff-note">You may be required to provide proof of purchase.</p>
          </>
        )}
      </div>
    </div>
  );
}
