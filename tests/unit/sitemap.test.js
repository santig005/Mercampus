import { describe, expect, it } from 'vitest';

import { SITE_URL } from '@/lib/metadata';
import { buildSitemap, productPath } from '@/lib/sitemap';

const sellers = [{ id: 'seller1', updatedAt: new Date('2026-01-02') }];
const products = [
  { id: 'prod1', section: 'antojos', updatedAt: new Date('2026-01-03') },
  { id: 'prod2', section: 'marketplace', updatedAt: new Date('2026-01-04') },
];

const urls = entries => entries.map(entry => entry.url);

describe('productPath (T-74)', () => {
  it('a marketplace product lives under /marketplace', () => {
    expect(productPath({ id: 'x', section: 'marketplace' })).toBe('/marketplace/x');
  });

  it('an antojos one lives under /antojos', () => {
    expect(productPath({ id: 'x', section: 'antojos' })).toBe('/antojos/x');
  });

  // Products predating T-19's migration have no `section`; the schema
  // defaults it to 'antojos', and this follows that default rather than
  // leaving the URL without a section.
  it('with no section it falls back to antojos, like the schema default', () => {
    expect(productPath({ id: 'x', section: undefined })).toBe('/antojos/x');
  });
});

describe('buildSitemap (T-74)', () => {
  it('all URLs are absolute and on the same host', () => {
    const entries = buildSitemap({ sellers, products });

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.url.startsWith(`${SITE_URL}/`)).toBe(true);
    }
  });

  it('includes the static public pages', () => {
    const found = urls(buildSitemap({ sellers: [], products: [] }));

    expect(found).toContain(`${SITE_URL}/antojos`);
    expect(found).toContain(`${SITE_URL}/marketplace`);
    expect(found).toContain(`${SITE_URL}/antojos/sellers/list`);
    expect(found).toContain(`${SITE_URL}/`);
  });

  // T-152b: the reverse of what this used to check. `/` was a 308 to
  // /antojos and had to stay out; now it is the home page, and /about is the
  // redirect (next.config.mjs), so that is the one a crawler must not be
  // sent to.
  it('does not advertise /about, which is now a permanent redirect to /', () => {
    expect(urls(buildSitemap({ sellers: [], products: [] }))).not.toContain(`${SITE_URL}/about`);
  });

  it('one entry per seller and one per product, in its section', () => {
    const found = urls(buildSitemap({ sellers, products }));

    expect(found).toContain(`${SITE_URL}/antojos/sellers/seller1`);
    expect(found).toContain(`${SITE_URL}/antojos/prod1`);
    expect(found).toContain(`${SITE_URL}/marketplace/prod2`);
  });

  it('does not repeat URLs', () => {
    const found = urls(buildSitemap({ sellers, products }));

    expect(new Set(found).size).toBe(found.length);
  });

  it("uses each document's update date", () => {
    const entries = buildSitemap({ sellers, products });
    const seller = entries.find(e => e.url.endsWith('/sellers/seller1'));

    expect(seller.lastModified).toEqual(new Date('2026-01-02'));
  });

  it('a document with no updatedAt falls back to the generation date', () => {
    const now = new Date('2026-02-01');
    const entries = buildSitemap({
      sellers: [{ id: 'sin-fecha' }],
      products: [],
      now,
    });

    expect(entries.find(e => e.url.endsWith('sin-fecha')).lastModified).toEqual(now);
  });

  it('the home page declares its two languages (T-46, moved from /about in T-152b)', () => {
    const home = buildSitemap({ sellers: [], products: [] }).find(
      entry => entry.url === `${SITE_URL}/`
    );

    expect(home.alternates.languages).toEqual({
      es: `${SITE_URL}/`,
      en: `${SITE_URL}/en`,
    });
  });

  it('does not leak private screens', () => {
    const found = urls(buildSitemap({ sellers, products })).join(' ');

    for (const privada of ['/admin', '/auth/', '/sellers/profile', '/sellers/schedules', '/product/add']) {
      expect(found).not.toContain(privada);
    }
  });
});
