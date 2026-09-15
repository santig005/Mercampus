import { describe, expect, it } from 'vitest';

import { SITE_URL } from '@/lib/metadata';
import { buildSitemap } from '@/lib/sitemap';
import robots, { PRIVATE_PATHS } from '@/app/robots';

const rule = robots().rules[0];

// The URLs the sitemap does advertise, including a sample seller and
// ejemplo, en forma de path.
const publicPaths = buildSitemap({
  sellers: [{ id: '6a9f0000000000000000aaaa' }],
  products: [
    { id: '6a9f0000000000000000bbbb', section: 'antojos' },
    { id: '6a9f0000000000000000cccc', section: 'marketplace' },
  ],
}).map(entry => entry.url.replace(SITE_URL, ''));

describe('robots.txt (T-78)', () => {
  it('points at the sitemap: without this line, nobody finds T-74', () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it('allows the rest of the site', () => {
    expect(rule.allow).toBe('/');
    expect(rule.userAgent).toBe('*');
  });

  it("blocks the API, the admin, the login and the seller's screens", () => {
    for (const path of ['/api/', '/admin', '/auth/', '/antojos/product/add']) {
      expect(rule.disallow).toContain(path);
    }
  });

  // The trap: `/antojos/sellers/` as a single prefix would have deindexed
  // every public seller profile and the directory - exactly what the sitemap
  // acaba de empezar a anunciar.
  it('no rule blocks a URL the sitemap advertises', () => {
    const tapadas = publicPaths.filter(path =>
      PRIVATE_PATHS.some(prefix => path.startsWith(prefix))
    );

    expect(tapadas).toEqual([]);
  });

  it('in particular, the public profile and the seller directory stay allowed', () => {
    for (const path of ['/antojos/sellers/list', '/antojos/sellers/6a9f0000000000000000aaaa']) {
      expect(PRIVATE_PATHS.some(prefix => path.startsWith(prefix))).toBe(false);
    }
  });
});
