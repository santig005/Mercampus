import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/metadata';

// T-78. Next's native convention: this file becomes /robots.txt. Its whole
// point is the `sitemap` line - without it nothing tells a crawler that
// /sitemap.xml (T-74) exists, so that work reaches no one.
//
// No database access here, so unlike the sitemap this one is fine to
// prerender at build time.
//
// CAREFUL with the disallow prefixes: `/antojos/sellers/` looks like the
// natural way to hide the seller's own screens, and it would deindex every
// public seller profile (`/antojos/sellers/<id>`) and the seller directory
// (`/antojos/sellers/list`) - exactly the pages the sitemap just started
// advertising. Each private screen is listed by its own prefix instead, and a
// test asserts none of them shadow a public URL.
const PRIVATE_PATHS = [
  '/api/',
  '/admin',
  '/auth/',
  '/antojos/sellers/profile',
  '/antojos/sellers/products',
  '/antojos/sellers/schedules',
  '/antojos/sellers/register',
  '/antojos/sellers/approving',
  '/antojos/product/add',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

export { PRIVATE_PATHS };
