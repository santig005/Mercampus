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
