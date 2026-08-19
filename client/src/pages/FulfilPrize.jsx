import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFulfilment, completeFulfilment } from '../api';
import HokaCampaignShell from '../components/HokaCampaignShell';

function formatWhen(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function FulfilPrize() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fulfilledBy, setFulfilledBy] = useState('');

  useEffect(() => {
    getFulfilment(token)
      .then(setData)
      .catch((err) => setError(err.message || 'Fulfilment record not found'));
  }, [token]);

  async function handleFulfil() {
    setSaving(true);
    setError('');
    try {
      const next = await completeFulfilment(token, fulfilledBy);
      setData(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const fulfilled = data?.status === 'FULFILLED';

  return (
    <HokaCampaignShell
      artSrc="/campaigns/hoka/iwbg.jpg"
      heroClassName="hoka-hero--enter"
    >
      <div className="hoka-form-panel">
        <p className="hoka-kicker">Staff fulfilment</p>
        <h1 className="hoka-title">{fulfilled ? 'Prize already fulfilled' : 'Fulfil prize'}</h1>

        {error && <div className="hoka-error">{error}</div>}

        {!data && !error && <p className="hoka-lede">Loading…</p>}

        {data && (
          <>
            {fulfilled && (
              <div className="hoka-status">Prize already fulfilled</div>
            )}
            <div className="hoka-rows">
              <div><span>Store</span><strong>{data.storeName}</strong></div>
              <div><span>Winner</span><strong>{data.winner}</strong></div>
              <div><span>Mobile</span><strong>{data.mobile}</strong></div>
              <div><span>Purchase</span><strong>{data.purchase}</strong></div>
              <div><span>Purchase value</span><strong>${Number(data.purchaseValue || 0).toFixed(2)}</strong></div>
              <div><span>Prize</span><strong>{data.prize}</strong></div>
              <div><span>Redemption code</span><strong>{data.redemptionCode}</strong></div>
              <div><span>Status</span><strong>{data.status}</strong></div>
              {fulfilled && (
                <>
                  <div><span>Fulfilled</span><strong>{formatWhen(data.fulfilledAt)}</strong></div>
                  <div><span>Fulfilled by</span><strong>{data.fulfilledBy || '—'}</strong></div>
                </>
              )}
            </div>

            {!fulfilled && (
              <>
                <div className="hoka-field">
                  <label htmlFor="fulfilled-by">Fulfilled by</label>
                  <input
                    id="fulfilled-by"
                    type="text"
                    autoComplete="name"
                    placeholder="Staff name"
                    value={fulfilledBy}
                    onChange={(e) => setFulfilledBy(e.target.value)}
                  />
                </div>
                <button
                  className="hoka-cta"
                  type="button"
                  onClick={handleFulfil}
                  disabled={saving || fulfilledBy.trim().length < 2}
                >
                  {saving ? 'Saving…' : 'Confirm prize fulfilled'}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </HokaCampaignShell>
  );
}
