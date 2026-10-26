import '../campaigns/hoka.css';

export default function HokaCampaignShell({
  artSrc = '/campaigns/hoka/slide1.jpg',
  heroClassName = '',
  children,
}) {
  const isFulfil = heroClassName.includes('hoka-hero--fulfil');
  const isEnter = heroClassName.includes('hoka-hero--enter') && !isFulfil;
  const isVerify = heroClassName.includes('hoka-hero--verify');

  const bgStyle = (isEnter || isFulfil) ? { backgroundImage: `url(${artSrc})` } : undefined;

  return (
    <div
      className={`hoka-page${isEnter ? ' hoka-page--enter' : ''}${isVerify ? ' hoka-page--verify' : ''}${isFulfil ? ' hoka-page--fulfil' : ''}`}
      style={bgStyle}
    >
      {!isEnter && !isFulfil && (
        <div className="hoka-hero">
          <img src={artSrc} alt="HOKA and Cotswold Outdoor" />
          <div className="hoka-hero__fade" />
        </div>
      )}
      <div className="hoka-body">
        {children}
      </div>
    </div>
  );
}
