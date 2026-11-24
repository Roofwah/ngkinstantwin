import '../campaigns/ford.css';
import '../campaigns/niterra-entry-overrides.css';
import { NITERRA_LANDING_ART } from '../campaigns/niterraRepco';

/** White Ford-style shell — same layout as Ford Display Lab phone entry. */
export default function NiterraEntryShell({
  landingSrc = NITERRA_LANDING_ART,
  showLanding = true,
  children,
}) {
  return (
    <div className={`ford-page ford-page--niterra${showLanding ? ' ford-page--landing' : ''}`}>
      {showLanding && (
        <div className="ford-landing" aria-hidden="false">
          <img className="ford-landing__art" src={landingSrc} alt="" />
          <div className="ford-landing__fade" />
        </div>
      )}
      <div className="ford-container">
        <div className="ford-card">
          {children}
        </div>
      </div>
    </div>
  );
}
