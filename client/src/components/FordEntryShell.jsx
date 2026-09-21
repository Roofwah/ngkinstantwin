import '../campaigns/ford.css';
import { FORD_LANDING_ART } from '../campaigns/ford';

export default function FordEntryShell({
  landingSrc = FORD_LANDING_ART,
  showLanding = true,
  children,
}) {
  return (
    <div className={`ford-page${showLanding ? ' ford-page--landing' : ''}`}>
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
