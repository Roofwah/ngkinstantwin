import '../campaigns/polaris.css';
import { POLARIS_LANDING_ART } from '../campaigns/polaris';

export default function PolarisEntryShell({
  landingSrc = POLARIS_LANDING_ART,
  showLanding = true,
  children,
}) {
  return (
    <div className={`polaris-page${showLanding ? ' polaris-page--landing' : ''}`}>
      {showLanding && (
        <div className="polaris-landing" aria-hidden="false">
          <img className="polaris-landing__art" src={landingSrc} alt="" />
          <div className="polaris-landing__fade" />
        </div>
      )}
      <div className="polaris-container">
        <div className="polaris-card">
          {children}
        </div>
      </div>
    </div>
  );
}
