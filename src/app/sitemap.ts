import type { MetadataRoute } from 'next';

import { buildSitemap } from '@/lib/sitemap';
import { getPublicSitemapData } from '@/server/sitemap/getPublicSitemapData';

// T-74. Next.js' native convention: this file becomes /sitemap.xml, no
// dependency and no route handler of our own.
//
// Generated per request, never at build time. `revalidate` was the first
// instinct - the catalogue changes when sellers publish, so a sitemap frozen
// at deploy time would advertise whatever existed on the day of the last
// deploy - but ISR still *prerenders* the page during `next build`, which
// means the build needs a database. CI builds without `MONGO_URI` and failed
// with `Error occurred prerendering page "/sitemap.xml"` /
// `openUri() must be a string, got "undefined"`. It passed locally only
// because Next loads `.env`, so the local build was quietly querying the
// production database.
//
// Every other route in this app is already server-rendered on demand (the
// build output marks them all `ƒ`); the sitemap was the odd one out. Two lean
// indexed queries per crawl is the right trade.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { sellers, products } = await getPublicSitemapData();

  return buildSitemap({ sellers, products });
}
