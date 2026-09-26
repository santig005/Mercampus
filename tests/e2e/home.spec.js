import { expect, test } from '@playwright/test';

// T-152b: `/` used to answer 308 -> /antojos, so the site had no home page.
// The landing that lived at /about is now served at `/` and `/en`, and
// /about redirects there.

test.describe('home page (T-152b)', () => {
  for (const { path, lang, title, description } of [
    {
      path: '/',
      lang: 'es',
      title: 'Mercampus · Conecta, compra y vende dentro de tu universidad',
      description: /^La plataforma donde los estudiantes/,
    },
    {
      path: '/en',
      lang: 'en',
      title: 'Mercampus · Connect, buy, and sell within your university',
      description: /students/i,
    },
  ]) {
    test(`${path} is a page, not a redirect, with one h1 and its own metadata`, async ({
      request,
      page,
    }) => {
      // The regression itself: the root answered 308.
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(200);

      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);

      const headings = page.locator('h1');
      await expect(headings).toHaveCount(1);
      await expect(headings).toHaveText('Mercampus');

      await expect(page).toHaveTitle(title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        description
      );
    });
  }

  for (const [from, to] of [
    ['/about', '/'],
    ['/en/about', '/en'],
  ]) {
    test(`${from} is a permanent redirect to ${to}`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });

      expect(response.status()).toBe(308);
      expect(new URL(response.headers().location, 'http://x').pathname).toBe(to);
    });
  }
});

// T-152c: the Organization markup is in the rendered HTML, parses, is emitted
// exactly once, and only on the home page. The emitted object itself is pinned
// in tests/unit/structured-data.test.js; this checks it reaches the page.
test.describe('Organization JSON-LD (T-152c)', () => {
  const jsonLd = page => page.locator('script[type="application/ld+json"]');

  for (const path of ['/', '/en']) {
    test(`${path} emits one Organization, with a logo that exists`, async ({ page, request }) => {
      await page.goto(path);

      await expect(jsonLd(page)).toHaveCount(1);
      const data = JSON.parse(await jsonLd(page).textContent());
      expect(data['@type']).toBe('Organization');
      expect(data.name).toBe('Mercampus');

      // The logo is an absolute production URL; check the same path is served
      // by this build, so the markup never points at a missing file (the root
      // layout's openGraph image does - see ROADMAP.md).
      const logo = await request.get(new URL(data.logo).pathname);
      expect(logo.status()).toBe(200);
    });
  }

  test('the listing does not repeat it', async ({ page }) => {
    await page.goto('/antojos');
    await expect(jsonLd(page)).toHaveCount(0);
  });
});
