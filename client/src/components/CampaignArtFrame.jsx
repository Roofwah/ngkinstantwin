const DEFAULT_ART = '/instant-win/bg.png';

/**
 * Unified campaign layout — art bleeds into content on mobile (not a dumped image block).
 */
export function CampaignShell({ artSrc = DEFAULT_ART, landing = false, children }) {
  return (
    <div className={`campaign-shell${landing ? ' campaign-shell--landing' : ''}`}>
      <div className="campaign-shell__media" aria-hidden="false">
        <img className="campaign-shell__art" src={artSrc} alt="" />
        <div className="campaign-shell__fade" />
        <p className="campaign-shell__eyebrow">POWERED BY PURERANDOM™</p>
      </div>

      <div className="campaign-shell__content">
        {children}
      </div>
    </div>
  );
}

export function CampaignLegalFooter({ storeName }) {
  return (
    <div className="campaign-shell__legal">
      <p className="campaign-shell__legal-line">
        Powered by PureRandom Instant Win Engine
      </p>
      <p className="campaign-shell__legal-line campaign-shell__legal-line--sub">
        Prize outcomes are determined by a secure server-side manifest.
        {storeName ? ` · ${storeName}` : ''}
      </p>
    </div>
  );
}
