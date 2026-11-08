import { unstable_cache } from 'next/cache';
import { getArticles, getCategories, getHomepageCategorySections, getHomepageCuration, getPublicLagosLocations } from './content';

/**
 * Public, published-only content. Keep short TTLs so editors see articles
 * shortly after publishing without re-querying Payload on every page visit.
 * Never put authenticated Studio data or reader details into these caches.
 */
export const getPublicHomepageData = unstable_cache(
  async () => Promise.all([getArticles(8), getHomepageCuration(), getHomepageCategorySections(4)]),
  ['ogastv-public-home-v2'], { revalidate: 60, tags: ['ogastv-public-home'] },
);
export const getPublicDirectoryData = unstable_cache(
  async () => Promise.all([getCategories(), getPublicLagosLocations()]),
  ['ogastv-public-directory-v1'], { revalidate: 300, tags: ['ogastv-public-taxonomy'] },
);
