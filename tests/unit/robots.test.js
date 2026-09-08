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
  it('apunta al sitemap: sin esta linea, T-74 no lo encuentra nadie', () => {
    expect(robots().sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it('permite el resto del sitio', () => {
    expect(rule.allow).toBe('/');
    expect(rule.userAgent).toBe('*');
  });

  it('bloquea la API, el admin, el login y las pantallas del vendedor', () => {
    for (const path of ['/api/', '/admin', '/auth/', '/antojos/product/add']) {
      expect(rule.disallow).toContain(path);
    }
  });

  // The trap: `/antojos/sellers/` as a single prefix would have deindexed
  // every public seller profile and the directory - exactly what the sitemap
  // acaba de empezar a anunciar.
  it('ninguna regla tapa una URL que el sitemap anuncia', () => {
    const tapadas = publicPaths.filter(path =>
      PRIVATE_PATHS.some(prefix => path.startsWith(prefix))
    );

    expect(tapadas).toEqual([]);
  });

  it('en particular, el perfil publico y el directorio de vendedores siguen permitidos', () => {
    for (const path of ['/antojos/sellers/list', '/antojos/sellers/6a9f0000000000000000aaaa']) {
      expect(PRIVATE_PATHS.some(prefix => path.startsWith(prefix))).toBe(false);
    }
  });
});
