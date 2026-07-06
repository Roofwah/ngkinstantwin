/** Artwork + branding for instant-win form variants. Override per campaign via config.heroImageUrl. */

export const INSTANT_WIN_THEMES = {
  /** Default — PureRandom lockup + campaign partner brands */
  v1: {
    id: 'v1',
    logo: '/logos/purerandom.svg',
    brands: null,
    logoFallback: '/logos/purerandom.svg',
    heroStyle: 'classic',
  },
  /** Full-width campaign hero — artwork includes all branding */
  v2: {
    id: 'v2',
    heroImage: '/instant-win/hero.png',
    heroOnly: true,
    heroStyle: 'banner',
  },
};

export function getInstantWinTheme(version = 'v1', campaign = null) {
  const cfg = campaign?.config || {};
  const heroImage = cfg.heroImageUrl || INSTANT_WIN_THEMES[version]?.heroImage;
  const useHeroBanner = version === 'v2' || !!cfg.heroImageUrl;
  const base = useHeroBanner ? INSTANT_WIN_THEMES.v2 : (INSTANT_WIN_THEMES[version] || INSTANT_WIN_THEMES.v1);
  const themeColor = cfg.themeColor || '#00c853';

  return {
    ...base,
    logo: cfg.logoUrl || base.logo,
    brands: cfg.brandsUrl ?? base.brands,
    heroImage: heroImage || base.heroImage,
    heroOnly: base.heroOnly ?? !!cfg.heroImageUrl,
    themeColor,
    tagline: campaign?.tagline || 'Buy eligible products and instantly win',
    campaignName: campaign?.name || 'Instant Win',
    brand: campaign?.brand || '',
  };
}
