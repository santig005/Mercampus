import type { MetadataRoute } from 'next';

import { buildSitemap } from '@/lib/sitemap';
import { getPublicSitemapData } from '@/server/sitemap/getPublicSitemapData';

// T-74. Next.js' native convention: this file becomes /sitemap.xml, no
// dependency and no route handler of our own.
//
// Revalidated hourly rather than built once: the catalogue changes when
// sellers publish, and a sitemap frozen at deploy time would advertise
// whatever existed the day of the last deploy.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { sellers, products } = await getPublicSitemapData();

  return buildSitemap({ sellers, products });
}
