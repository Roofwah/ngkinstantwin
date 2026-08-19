function formatResult(result) {
  if (!result) return '—';
  if (result === 'NOT_WINNER') return 'No instant win — draw entry';
  return result.replace(/_/g, ' ');
}

function formatMoney(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  return `$${Number(amount).toFixed(2)}`;
}

function formatDateTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function ReportRow({ label, value }) {
  return (
    <div className="lab-report__row">
      <span className="lab-report__label">{label}</span>
      <span className="lab-report__value">{value || '—'}</span>
    </div>
  );
}

export default function CampaignReportModal({ open, report, session, onClose }) {
  if (!open) return null;

  const data = report || {};
  const isWinner = data.result && data.result !== 'NOT_WINNER';

  return (
    <div className="lab-report-overlay" role="presentation" onClick={onClose}>
      <div
        className="lab-report-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-report-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lab-report-modal__header">
          <div>
            <div className="lab-report-modal__eyebrow">Campaign reporting</div>
            <h2 id="lab-report-title" className="lab-report-modal__title">Entry summary</h2>
          </div>
          <button type="button" className="lab-report-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {!report ? (
          <p className="lab-report-modal__empty">Waiting for claim data…</p>
        ) : (
          <div className="lab-report-modal__body">
            <section className="lab-report__section">
              <h3 className="lab-report__heading">Participant</h3>
              <ReportRow label="Name" value={data.customerName} />
              <ReportRow label="Mobile" value={data.mobile} />
            </section>

            <section className="lab-report__section">
              <h3 className="lab-report__heading">Access point</h3>
              <ReportRow label="Location" value={data.accessPointLabel} />
              <ReportRow label="QR code" value={data.accessPointId} />
              <ReportRow label="Session" value={session?.sessionId} />
            </section>

            <section className="lab-report__section">
              <h3 className="lab-report__heading">Purchase</h3>
              <ReportRow label="Invoice #" value={data.receiptNumber} />
              <ReportRow label="Amount" value={formatMoney(data.spendAmount)} />
              <ReportRow label="Brand" value={data.selectedBrand} />
              <ReportRow label="Purchase date" value={data.purchaseDate} />
              {data.storeName && <ReportRow label="Store" value={data.storeName} />}
              <ReportRow label="Receipt source" value={data.receiptSource} />
              {data.minSpend != null && (
                <ReportRow label="Min spend rule" value={formatMoney(data.minSpend)} />
              )}
            </section>

            <section className="lab-report__section">
              <h3 className="lab-report__heading">Receipt</h3>
              {data.receiptUrl ? (
                data.receiptIsPdf ? (
                  <a className="lab-report__receipt-link" href={data.receiptUrl} target="_blank" rel="noreferrer">
                    View receipt PDF
                  </a>
                ) : (
                  <a href={data.receiptUrl} target="_blank" rel="noreferrer" className="lab-report__receipt-img-wrap">
                    <img src={data.receiptUrl} alt="Receipt" className="lab-report__receipt-img" />
                  </a>
                )
              ) : (
                <p className="lab-report__hint">No receipt image on file</p>
              )}
            </section>

            <section className={`lab-report__section lab-report__section--outcome${isWinner ? ' lab-report__section--win' : ''}`}>
              <h3 className="lab-report__heading">Outcome</h3>
              <ReportRow label="Result" value={formatResult(data.result)} />
              <ReportRow label="Prize" value={data.prizeName || (data.result === 'NOT_WINNER' ? 'Weekly draw entry' : '—')} />
              <ReportRow label="Claim status" value={data.claimStatus} />
              <ReportRow label="Submitted" value={formatDateTime(data.submittedAt)} />
            </section>
          </div>
        )}

        <footer className="lab-report-modal__footer">
          <button type="button" className="lab-report-modal__btn" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}
