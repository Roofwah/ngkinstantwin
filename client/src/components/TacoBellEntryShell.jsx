import '../campaigns/tacoBell.css';
import { TACO_BELL_LANDING_ART } from '../campaigns/tacoBell';

export default function TacoBellEntryShell({
  landingSrc = TACO_BELL_LANDING_ART,
  showLanding = true,
  children,
}) {
  return (
    <div className={`taco-bell-page${showLanding ? ' taco-bell-page--landing' : ''}`}>
      {showLanding && (
        <div className="taco-bell-landing" aria-hidden="false">
          <img className="taco-bell-landing__art" src={landingSrc} alt="" />
          <div className="taco-bell-landing__fade" />
        </div>
      )}
      <div className="taco-bell-container">
        <div className="taco-bell-card">
          {children}
        </div>
      </div>
    </div>
  );
}
