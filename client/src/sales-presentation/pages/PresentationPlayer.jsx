import { useMemo, useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PukModelViewer from '../puk3d/PukModelViewer';
import { PREVIEW_CAMPAIGN, isPresentationCode } from '../config/previewCampaign';
import PresentationUnavailable from './PresentationUnavailable';
import ValuePropositionCycle from '../components/ValuePropositionCycle';
import '../styles/presentation.css';
import '../puk3d/pukModelViewer.css';

/**
 * Isolated 3D PUK sales presentation.
 * Explore mode = looping six-part commercial typography (no modal / bullets).
 * Independent of DeviceSimulator / zitcha demo. No setDemoCampaign.
 */
export default function PresentationPlayer() {
  const { code } = useParams();
  const [exploreActive, setExploreActive] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.title = 'PUK';
    let robots = document.querySelector('meta[name="robots"]');
    const created = !robots;
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    const prevRobots = robots.getAttribute('content');
    robots.setAttribute('content', 'noindex, nofollow');
    return () => {
      document.title = prev;
      if (created && robots.parentNode) robots.parentNode.removeChild(robots);
      else if (prevRobots != null) robots.setAttribute('content', prevRobots);
    };
  }, []);

  useEffect(() => {
    if (!exploreActive) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setExploreActive(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exploreActive]);

  const startExplore = useCallback(() => setExploreActive(true), []);
  const stopExplore = useCallback(() => setExploreActive(false), []);

  const screenMedia = useMemo(() => {
    if (PREVIEW_CAMPAIGN.idleVideo) {
      return { type: 'video', src: PREVIEW_CAMPAIGN.idleVideo, key: PREVIEW_CAMPAIGN.idleVideo };
    }
    if (PREVIEW_CAMPAIGN.idleFallback) {
      return { type: 'image', src: PREVIEW_CAMPAIGN.idleFallback, key: PREVIEW_CAMPAIGN.idleFallback };
    }
    return { type: 'color', color: 0x050505, key: 'empty' };
  }, []);

  if (!isPresentationCode(code)) {
    return <PresentationUnavailable />;
  }

  return (
    <div className={`sp-root${exploreActive ? ' is-explore' : ''}`}>
      <div className="sp-shell">
        <div className="sp-hero">
          <header className="sp-header">
            <img
              className="sp-header__logo"
              src="/puk/puk-logo.svg"
              alt="PUK"
            />
            <p className="sp-header__example">
              Demo: <span>{PREVIEW_CAMPAIGN.exampleLabel}</span>
            </p>
          </header>

          <div className="sp-stage" role="main">
            <div className="sp-stage__inner">
              <PukModelViewer
                active
                screenMedia={screenMedia}
              />
            </div>
          </div>

          {!exploreActive && (
            <div className="sp-explore-wrap">
              <button type="button" className="sp-explore-btn" onClick={startExplore}>
                Explore PUK +
              </button>
            </div>
          )}

          {!exploreActive && (
            <footer className="sp-footer">
              © {new Date().getFullYear()} Flow MKTG Pty Ltd / Flow MKTG LLC
            </footer>
          )}
        </div>

        <ValuePropositionCycle
          active={exploreActive}
          onClose={stopExplore}
        />
      </div>
    </div>
  );
}
