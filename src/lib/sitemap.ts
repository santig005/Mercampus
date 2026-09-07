import { SITE_URL } from '@/lib/metadata';

// T-74. Turning the public catalogue into sitemap entries. Pure, so the URL
// shapes can be unit tested without a database; the reads live in
// src/server/sitemap/getPublicSitemapData.ts.

export type SitemapSeller = { id: string; updatedAt?: Date | null };
export type SitemapProduct = {
  id: string;
  section?: string | null;
  updatedAt?: Date | null;
};

export type SitemapEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  alternates?: { languages: Record<string, string> };
};

const absolute = (path: string) => `${SITE_URL}${path}`;

// A product lives under the section it belongs to: the two routes render the
// same product and only differ in the section they show it in, so listing both
// would be duplicate content pointing at the same thing.
export function productPath(product: SitemapProduct): string {
  return product.section === 'marketplace'
    ? `/marketplace/${product.id}`
    : `/antojos/${product.id}`;
}

// `/` is a permanent redirect to /antojos (next.config.mjs), so the listing is
// the entry point, not the root. /landing is left out on purpose: nothing in
// src/ links to it and it may be dead - confirm before advertising it.
// Seller-only, admin and auth screens are not public content.
function staticEntries(now: Date): SitemapEntry[] {
  return [
    { url: absolute('/antojos'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absolute('/marketplace'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    {
      url: absolute('/antojos/sellers/list'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: absolute('/about'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
      // T-46 migrated /about to next-intl, so it genuinely exists in two
      // languages and each should point at the other.
      alternates: {
        languages: { es: absolute('/about'), en: absolute('/en/about') },
      },
    },
  ];
}

export function buildSitemap({
  sellers,
  products,
  now = new Date(),
}: {
  sellers: SitemapSeller[];
  products: SitemapProduct[];
  now?: Date;
}): SitemapEntry[] {
  return [
    ...staticEntries(now),
    ...sellers.map(seller => ({
      url: absolute(`/antojos/sellers/${seller.id}`),
      lastModified: seller.updatedAt ?? now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...products.map(product => ({
      url: absolute(productPath(product)),
      lastModified: product.updatedAt ?? now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
