import '../campaigns/audi.css';

const DEFAULT_FORM_ART = '/campaigns/audi/iwbg.png';

export default function AudiEntryShell({
  artSrc = DEFAULT_FORM_ART,
  phase = 'form',
  children,
}) {
  const showArt = phase === 'form' || phase === 'verify';

  return (
    <div
      className={`audi-page${showArt ? ' audi-page--enter' : ''}${phase === 'verify' ? ' audi-page--verify' : ''}`}
      style={showArt ? { backgroundImage: `url(${artSrc})` } : undefined}
    >
      <div className="audi-body">
        {children}
      </div>
    </div>
  );
}
