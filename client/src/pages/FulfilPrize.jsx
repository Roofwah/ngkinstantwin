import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFulfilment, completeFulfilment } from '../api';
import CustomerQrFulfilPanel from '../components/CustomerQrFulfilPanel';
import HokaCampaignShell from '../components/HokaCampaignShell';
import NiterraCrosswordShell from '../components/NiterraCrosswordShell';
import { NITERRA_CAMPAIGN_ID, NITERRA_FORM_ART } from '../campaigns/niterraRepco';
import '../campaigns/niterra-repco.css';
import '../campaigns/fulfil-page.css';

const OPTION_STOCK = 'fulfilled';
const OPTION_ORDER = 'ship_to_store';

function formatWhen(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function isNiterraFulfil(data) {
  if (!data) return false;
  return data.campaignId === NITERRA_CAMPAIGN_ID
    || data.verificationMethod === 'niterra_crossword';
}

function FulfilPanel({
  niterra,
  fulfilled,
  shipToStore,
  closed,
  error,
  data,
  fulfilledBy,
  setFulfilledBy,
  selectedOption,
  setSelectedOption,
  shipConfirm,
  setShipConfirm,
  saving,
  onConfirm,
}) {
  const panel = niterra ? 'ngk-form-panel' : 'hoka-form-panel';
  const kicker = niterra ? 'ngk-kicker' : 'hoka-kicker';
  const title = niterra ? 'ngk-title' : 'hoka-title';
  const lede = niterra ? 'ngk-lede' : 'hoka-lede';
  const err = niterra ? 'ngk-error' : 'hoka-error';
  const statusCls = niterra ? 'ngk-status' : 'hoka-status';
  const rows = niterra ? 'ngk-rows' : 'hoka-rows';
  const field = niterra ? 'ngk-field' : 'hoka-field';
  const cta = niterra ? 'ngk-cta' : 'hoka-cta';

  const staffOk = fulfilledBy.trim().length >= 2;
  const optionReady = selectedOption === OPTION_STOCK
    || (selectedOption === OPTION_ORDER && shipConfirm);
  const canConfirm = staffOk && optionReady && !saving;

  let heading = 'Fulfil prize';
  if (fulfilled) heading = 'Fulfilled from store stock';
  else if (shipToStore) heading = 'Order to store confirmed';

  const statusText = data?.statusLabel
    || (fulfilled ? 'Fulfilled from store stock' : shipToStore ? 'No stock — order to store' : 'Awaiting fulfilment');

  return (
    <div className={panel}>
      <p className={kicker}>Staff fulfilment</p>
      <h1 className={title}>{heading}</h1>

      {error && <div className={err}>{error}</div>}

      {!data && !error && <p className={lede}>Loading…</p>}

      {data && (
        <>
          {fulfilled && (
            <div className={statusCls}>Prize handed to the customer from store stock.</div>
          )}
          {shipToStore && (
            <div className={statusCls}>
              Item will be ordered and shipped to this store location only — not to the customer.
            </div>
          )}
          <div className={rows}>
            <div><span>Store</span><strong>{data.storeName}</strong></div>
            <div><span>Winner</span><strong>{data.winner}</strong></div>
            <div><span>Mobile</span><strong>{data.mobile}</strong></div>
            <div><span>Purchase</span><strong>{data.purchase}</strong></div>
            <div><span>Purchase value</span><strong>${Number(data.purchaseValue || 0).toFixed(2)}</strong></div>
            <div><span>Prize</span><strong>{data.prize}</strong></div>
            <div><span>Redemption code</span><strong>{data.redemptionCode}</strong></div>
            <div><span>Status</span><strong>{statusText}</strong></div>
            {closed && (
              <>
                <div><span>Confirmed</span><strong>{formatWhen(data.fulfilledAt)}</strong></div>
                <div><span>Confirmed by</span><strong>{data.fulfilledBy || '—'}</strong></div>
              </>
            )}
          </div>

          {!closed && (
            <>
              <p className={lede}>Select one option, enter your name, then confirm.</p>

              <div className="fulfil-options" role="radiogroup" aria-label="Fulfilment option">
                <label
                  className={`fulfil-option${selectedOption === OPTION_STOCK ? ' fulfil-option--selected' : ''}`}
                >
                  <div className="fulfil-option__head">
                    <input
                      type="radio"
                      name="fulfil-option"
                      checked={selectedOption === OPTION_STOCK}
                      onChange={() => {
                        setSelectedOption(OPTION_STOCK);
                        setShipConfirm(false);
                      }}
                    />
                    <div>
                      <p className="fulfil-option__title">Option 1 — Fulfilled from store stock</p>
                      <p className="fulfil-option__desc">
                        The prize was taken from stock on hand and handed to the customer in store.
                      </p>
                    </div>
                  </div>
                </label>

                <label
                  className={`fulfil-option${selectedOption === OPTION_ORDER ? ' fulfil-option--selected' : ''}`}
                >
                  <div className="fulfil-option__head">
                    <input
                      type="radio"
                      name="fulfil-option"
                      checked={selectedOption === OPTION_ORDER}
                      onChange={() => setSelectedOption(OPTION_ORDER)}
                    />
                    <div>
                      <p className="fulfil-option__title">Option 2 — No stock, order to store</p>
                      <p className="fulfil-option__desc">
                        The prize is not in stock. Order it and ship it to this store location only.
                      </p>
                    </div>
                  </div>
                  {selectedOption === OPTION_ORDER && (
                    <div className="fulfil-option__extra">
                      <label className="fulfil-option__confirm">
                        <input
                          type="checkbox"
                          checked={shipConfirm}
                          onChange={(e) => setShipConfirm(e.target.checked)}
                        />
                        <span>
                          I confirm the item will be ordered and shipped to this store.
                        </span>
                      </label>
                    </div>
                  )}
                </label>
              </div>

              <div className={field}>
                <label htmlFor="fulfilled-by">Staff name</label>
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
                className={cta}
                type="button"
                onClick={onConfirm}
                disabled={!canConfirm}
              >
                {saving ? 'Saving…' : 'Confirm selection'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function FulfilPrize() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fulfilledBy, setFulfilledBy] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [shipConfirm, setShipConfirm] = useState(false);

  useEffect(() => {
    getFulfilment(token)
      .then(setData)
      .catch((err) => setError(err.message || 'Fulfilment record not found'));
  }, [token]);

  async function handleConfirm() {
    if (!selectedOption) return;
    setSaving(true);
    setError('');
    try {
      const next = await completeFulfilment(token, fulfilledBy, selectedOption);
      setData(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (data?.customerQrRedemption) {
    return <CustomerQrFulfilPanel token={token} initial={data} />;
  }

  const fulfilled = data?.status === 'FULFILLED';
  const shipToStore = data?.status === 'SHIP_TO_STORE';
  const closed = fulfilled || shipToStore;
  const niterra = isNiterraFulfil(data);

  const panel = (
    <FulfilPanel
      niterra={niterra}
      fulfilled={fulfilled}
      shipToStore={shipToStore}
      closed={closed}
      error={error}
      data={data}
      fulfilledBy={fulfilledBy}
      setFulfilledBy={setFulfilledBy}
      selectedOption={selectedOption}
      setSelectedOption={setSelectedOption}
      shipConfirm={shipConfirm}
      setShipConfirm={setShipConfirm}
      saving={saving}
      onConfirm={handleConfirm}
    />
  );

  if (niterra) {
    return (
      <NiterraCrosswordShell
        artSrc={NITERRA_FORM_ART}
        heroClassName="ngk-hero--enter ngk-page--fulfil"
      >
        {panel}
      </NiterraCrosswordShell>
    );
  }

  return (
    <HokaCampaignShell
      artSrc="/campaigns/hoka/iwbg.jpg"
      heroClassName="hoka-hero--fulfil"
    >
      {panel}
    </HokaCampaignShell>
  );
}
