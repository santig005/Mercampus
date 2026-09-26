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

// T-152b: `/` is the home page (it used to be a 308 to /antojos, which is why
// the listing was the first entry here). /about is gone from this list: it is
// now a redirect to `/`, and a sitemap must not list redirects. Seller-only,
// admin and auth screens are not public content.
function staticEntries(now: Date): SitemapEntry[] {
  return [
    {
      url: absolute('/'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1,
      // Migrated to next-intl (T-46, as /about), so it exists in two
      // languages and each should point at the other.
      alternates: {
        languages: { es: absolute('/'), en: absolute('/en') },
      },
    },
    { url: absolute('/antojos'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absolute('/marketplace'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    {
      url: absolute('/antojos/sellers/list'),
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
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
