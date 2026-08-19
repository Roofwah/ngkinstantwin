import '../campaigns/hoka.css';

export default function HokaCampaignShell({
  artSrc = '/campaigns/hoka/slide1.jpg',
  heroClassName = '',
  children,
}) {
  const isEnter = heroClassName.includes('hoka-hero--enter');

  return (
    <div
      className={`hoka-page${isEnter ? ' hoka-page--enter' : ''}`}
      style={isEnter ? { backgroundImage: `url(${artSrc})` } : undefined}
    >
      {!isEnter && (
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
