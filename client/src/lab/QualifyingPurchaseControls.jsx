const DEFAULT_SPEND_OPTIONS = [15, 25, 50, 75, 100];

export default function QualifyingPurchaseControls({ config, rules, onRulesChange, disabled }) {
  const spendOptions = config?.qualifyingPurchaseRules?.minSpendOptions || DEFAULT_SPEND_OPTIONS;
  const minSpend = rules?.minSpend ?? config?.qualifyingPurchaseRules?.defaultMinSpend ?? 15;
  const allowDuplicateReceipts = rules?.allowDuplicateReceipts
    ?? config?.qualifyingPurchaseRules?.defaultAllowDuplicateReceipts
    ?? false;

  function setMinSpend(value) {
    if (disabled || value === minSpend) return;
    onRulesChange({ minSpend: value });
  }

  function toggleDuplicates() {
    if (disabled) return;
    onRulesChange({ allowDuplicateReceipts: !allowDuplicateReceipts });
  }

  return (
    <div className="lab-qualifying">
      <p className="lab-card__body">{config.qualifyingPurchase}</p>
      <p className="lab-card__meta lab-qualifying__brands">
        {config.eligibleBrands?.join(' · ')}
      </p>

      <div className="lab-qualifying__field">
        <span className="lab-qualifying__label">Minimum spend</span>
        <div className="lab-qualifying__spend-options" role="group" aria-label="Minimum spend">
          {spendOptions.map((amount) => (
            <button
              key={amount}
              type="button"
              className={`lab-qualifying__spend-btn${minSpend === amount ? ' lab-qualifying__spend-btn--active' : ''}`}
              onClick={() => setMinSpend(amount)}
              disabled={disabled}
              aria-pressed={minSpend === amount}
            >
              ${amount}
            </button>
          ))}
        </div>
      </div>

      <div className="lab-qualifying__field lab-qualifying__field--toggle">
        <div className="lab-qualifying__toggle-copy">
          <span className="lab-qualifying__label">Allow duplicate receipts</span>
          <span className="lab-qualifying__hint">For demo only</span>
        </div>
        <button
          type="button"
          role="switch"
          className={`lab-toggle${allowDuplicateReceipts ? ' lab-toggle--on' : ''}`}
          aria-checked={allowDuplicateReceipts}
          onClick={toggleDuplicates}
          disabled={disabled}
        >
          <span className="lab-toggle__thumb" />
        </button>
      </div>
    </div>
  );
}
