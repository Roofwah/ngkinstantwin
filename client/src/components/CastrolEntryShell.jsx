import '../campaigns/castrol.css';
import { CASTROL_LANDING_ART } from '../campaigns/castrol';

export default function CastrolEntryShell({
  landingSrc = CASTROL_LANDING_ART,
  showLanding = true,
  children,
}) {
  return (
    <div className={`castrol-page${showLanding ? ' castrol-page--landing' : ''}`}>
      {showLanding && (
        <div className="castrol-landing" aria-hidden="false">
          <img className="castrol-landing__art" src={landingSrc} alt="" />
          <div className="castrol-landing__fade" />
        </div>
      )}
      <div className="castrol-container">
        <div className="castrol-card">
          {children}
        </div>
      </div>
    </div>
  );
}
