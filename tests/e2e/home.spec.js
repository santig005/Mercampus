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

// T-152c: the Organization markup has to be in the HTML the server sends,
// as a real <script> element. The first version put it in the landing's
// layout, under the root layout's <ClerkLoaded>, which the server does not
// render: a browser got it once Clerk loaded (and the browser-based check
// that used to be here passed), while validator.schema.org errored and
// Google's Rich Results Test found nothing. So this reads the raw response,
// with no browser, the way a crawler does. The emitted object itself is
// pinned in tests/unit/structured-data.test.js.
const JSON_LD_ELEMENT = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

test.describe('Organization JSON-LD in the server HTML (T-152c)', () => {
  for (const path of ['/', '/en', '/antojos']) {
    test(`${path}: one real JSON-LD element, before any JavaScript runs`, async ({
      request,
      page,
    }) => {
      const html = await (await request.get(path)).text();
      const elements = [...html.matchAll(JSON_LD_ELEMENT)];

      expect(elements).toHaveLength(1);
      const data = JSON.parse(elements[0][1]);
      expect(data['@type']).toBe('Organization');
      expect(data.name).toBe('Mercampus');

      // The logo is an absolute production URL; check this build serves the
      // same path, so the markup never points at a missing file.
      const logo = await request.get(new URL(data.logo).pathname);
      expect(logo.status()).toBe(200);

      // And hydration does not add a second copy.
      await page.goto(path);
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
    });
  }
});
