import '../campaigns/niterra-repco.css';

const DEFAULT_ENTER_ART = '/campaigns/niterra/iwbg.png';

export default function NiterraCrosswordShell({
  artSrc = DEFAULT_ENTER_ART,
  heroClassName = '',
  children,
}) {
  const isEnter = heroClassName.includes('ngk-hero--enter');
  const isVerify = heroClassName.includes('ngk-hero--verify');
  const isFulfil = heroClassName.includes('ngk-page--fulfil');
  const useHeroBg = isEnter || isFulfil;

  return (
    <div
      className={`ngk-page${useHeroBg ? ' ngk-page--enter' : ''}${isVerify ? ' ngk-page--verify' : ''}${isFulfil ? ' ngk-page--fulfil' : ''}`}
      style={useHeroBg ? { backgroundImage: `url(${artSrc})` } : undefined}
    >
      <div className="ngk-body">
        {children}
      </div>
    </div>
  );
}
