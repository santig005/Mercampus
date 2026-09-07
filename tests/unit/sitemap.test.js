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
  it('un producto de marketplace vive bajo /marketplace', () => {
    expect(productPath({ id: 'x', section: 'marketplace' })).toBe('/marketplace/x');
  });

  it('uno de antojos vive bajo /antojos', () => {
    expect(productPath({ id: 'x', section: 'antojos' })).toBe('/antojos/x');
  });

  // Los productos anteriores a la migracion de T-19 no tienen `section`; el
  // schema pone 'antojos' por defecto, y esto acompaña ese default en vez de
  // dejar la URL sin seccion.
  it('sin seccion cae en antojos, como el default del schema', () => {
    expect(productPath({ id: 'x', section: undefined })).toBe('/antojos/x');
  });
});

describe('buildSitemap (T-74)', () => {
  it('todas las URLs son absolutas y del mismo host', () => {
    const entries = buildSitemap({ sellers, products });

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.url.startsWith(`${SITE_URL}/`)).toBe(true);
    }
  });

  it('incluye las paginas publicas estaticas', () => {
    const found = urls(buildSitemap({ sellers: [], products: [] }));

    expect(found).toContain(`${SITE_URL}/antojos`);
    expect(found).toContain(`${SITE_URL}/marketplace`);
    expect(found).toContain(`${SITE_URL}/antojos/sellers/list`);
    expect(found).toContain(`${SITE_URL}/about`);
  });

  // `/` redirige permanente a /antojos (next.config.mjs): anunciar la raiz
  // manda al crawler a un 308 en vez de a la pagina.
  it('no anuncia la raiz, que es un redirect permanente', () => {
    expect(urls(buildSitemap({ sellers: [], products: [] }))).not.toContain(`${SITE_URL}/`);
  });

  it('una entrada por vendedor y una por producto, en su seccion', () => {
    const found = urls(buildSitemap({ sellers, products }));

    expect(found).toContain(`${SITE_URL}/antojos/sellers/seller1`);
    expect(found).toContain(`${SITE_URL}/antojos/prod1`);
    expect(found).toContain(`${SITE_URL}/marketplace/prod2`);
  });

  it('no repite URLs', () => {
    const found = urls(buildSitemap({ sellers, products }));

    expect(new Set(found).size).toBe(found.length);
  });

  it('usa la fecha de actualizacion de cada documento', () => {
    const entries = buildSitemap({ sellers, products });
    const seller = entries.find(e => e.url.endsWith('/sellers/seller1'));

    expect(seller.lastModified).toEqual(new Date('2026-01-02'));
  });

  it('un documento sin updatedAt cae a la fecha de generacion', () => {
    const now = new Date('2026-02-01');
    const entries = buildSitemap({
      sellers: [{ id: 'sin-fecha' }],
      products: [],
      now,
    });

    expect(entries.find(e => e.url.endsWith('sin-fecha')).lastModified).toEqual(now);
  });

  it('/about declara sus dos idiomas (T-46)', () => {
    const about = buildSitemap({ sellers: [], products: [] }).find(
      entry => entry.url === `${SITE_URL}/about`
    );

    expect(about.alternates.languages).toEqual({
      es: `${SITE_URL}/about`,
      en: `${SITE_URL}/en/about`,
    });
  });

  it('no filtra pantallas privadas', () => {
    const found = urls(buildSitemap({ sellers, products })).join(' ');

    for (const privada of ['/admin', '/auth/', '/sellers/profile', '/sellers/schedules', '/product/add']) {
      expect(found).not.toContain(privada);
    }
  });
});
