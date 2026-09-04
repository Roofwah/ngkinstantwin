import '../campaigns/niterra-repco.css';

const DEFAULT_ENTER_ART = '/campaigns/niterra/iwbg.png';

export default function NiterraCrosswordShell({
  artSrc = DEFAULT_ENTER_ART,
  heroClassName = '',
  children,
}) {
  const isEnter = heroClassName.includes('ngk-hero--enter');
  const isVerify = heroClassName.includes('ngk-hero--verify');

  return (
    <div
      className={`ngk-page${isEnter ? ' ngk-page--enter' : ''}${isVerify ? ' ngk-page--verify' : ''}`}
      style={isEnter ? { backgroundImage: `url(${artSrc})` } : undefined}
    >
      <div className="ngk-body">
        {children}
      </div>
    </div>
  );
}
