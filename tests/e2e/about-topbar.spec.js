import { expect, test } from '@playwright/test';

// T-87 (audit finding F16). The /about topbar is sticky and transparent so the
// hero shows through it. Past the hero it stayed transparent and the wordmark,
// the language switcher and the CTA printed on top of the section text.
const topbar = page => page.locator('header[data-scrolled]');

const backgroundOf = locator =>
  locator.evaluate(element => getComputedStyle(element).backgroundColor);

const isTransparent = color => /rgba\([^)]*,\s*0\s*\)/.test(color);

// page.mouse.wheel() is not enough here, and CI proved it: /about animates its
// sections in with framer-motion, so on a cold runner the document can still be
// viewport-height when the wheel lands. The event goes nowhere, scrollY stays 0
// and the bar never flips. Wait until the page is actually scrollable, scroll,
// then wait until it moved.
const scrollDown = async (page, to = 900) => {
  await expect
    .poll(() => page.evaluate(() => document.body.scrollHeight - window.innerHeight))
    .toBeGreaterThan(to);

  await page.evaluate(y => window.scrollTo(0, y), to);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(24);
};

const scrollToTop = async page => {
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
};

// T-152b: the landing moved from /about to /; same page, same topbar.
test.describe('home page sticky topbar (T-87, was /about)', () => {
  test('transparent over the hero, opaque once the page scrolls', async ({ page }) => {
    await page.goto('/');

    // At the top it must stay see-through: the negative margin puts it over
    // the hero on purpose, and a solid bar there would be a worse design, not
    // a fix.
    await expect(topbar(page)).toHaveAttribute('data-scrolled', 'false');
    expect(isTransparent(await backgroundOf(topbar(page)))).toBe(true);

    await scrollDown(page);

    await expect(topbar(page)).toHaveAttribute('data-scrolled', 'true');
    expect(isTransparent(await backgroundOf(topbar(page)))).toBe(false);

    // The bar is still where it was - a surface, not a layout change.
    await expect(topbar(page)).toBeInViewport();

    await page.screenshot({ path: 'test-results/12-about-topbar-scrolled.png' });
  });

  test('scrolling back to the top puts the hero back behind it', async ({ page }) => {
    await page.goto('/');
    await scrollDown(page);
    await expect(topbar(page)).toHaveAttribute('data-scrolled', 'true');

    await scrollToTop(page);

    await expect(topbar(page)).toHaveAttribute('data-scrolled', 'false');

    // The header has `transition-colors duration-200`: `data-scrolled` flips
    // the instant React re-renders, but the background is still animating
    // from opaque to transparent for up to 200ms after that. A one-shot read
    // here races the transition and was the real, previously undocumented
    // cause of T-110's flake - going the other way (opaque check after
    // scrolling down) never flaked because "not transparent" is already true
    // the moment the transition *starts*, while "is transparent" is only true
    // once it *finishes*. Poll until the transition actually lands.
    await expect
      .poll(async () => isTransparent(await backgroundOf(topbar(page))))
      .toBe(true);
  });

  // F17 was exactly this page's hero looking fine in light and being unreadable
  // in dark, so the surface gets looked at in both themes rather than trusted
  // because it is written with tokens.
  test('the surface follows the theme into dark mode', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await scrollDown(page);
    await expect(topbar(page)).toHaveAttribute('data-scrolled', 'true');

    const background = await backgroundOf(topbar(page));
    expect(isTransparent(background)).toBe(false);
    // base-100 in dark is #241D17: if the bar ever resolves to a light surface
    // here, the tokens are not being read.
    expect(background).not.toMatch(/^rgba?\(2[45][0-9], 2[45][0-9], 2[45][0-9]/);

    await page.screenshot({ path: 'test-results/13-about-topbar-scrolled-dark.png' });
  });
});

// T-152d: under 640px the row (logo + wordmark, locale switcher, explore
// button) did not fit. The wordmark was squeezed under "Español" at every
// width below `sm`, and at 320px the button ran off the screen. Measured from
// the rendered boxes, not from class names: the fix is only real if the boxes
// stop colliding.
test.describe('home page topbar fits on a phone (T-152d)', () => {
  for (const width of [320, 360, 390, 414]) {
    test(`${width}px: nothing overlaps and nothing overflows`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');

      const bar = topbar(page);
      const logo = bar.getByRole('link', { name: /Mercampus/ }).first();
      const switcher = bar.locator('a[aria-current="true"]').locator('..');

      const logoBox = await logo.boundingBox();
      const switcherBox = await switcher.boundingBox();
      // The wordmark's own text must end before the switcher starts.
      const wordmarkRight = await logo.evaluate(el => {
        const box = el.querySelector('span').getBoundingClientRect();
        return box.right;
      });

      expect(wordmarkRight).toBeLessThanOrEqual(switcherBox.x);
      expect(logoBox.x + logoBox.width).toBeLessThanOrEqual(switcherBox.x);
      expect(switcherBox.x + switcherBox.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width
      );

      // The topbar's explore button is desktop-only now; the hero's is not.
      await expect(bar.getByRole('link', { name: 'Explorar Productos', exact: true })).toBeHidden();
      await expect(page.getByRole('link', { name: 'Explorar productos', exact: true })).toBeVisible();
    });
  }

  test('640px and up: the explore button is back in the topbar', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await page.goto('/');

    await expect(
      topbar(page).getByRole('link', { name: 'Explorar Productos', exact: true })
    ).toBeVisible();
  });
});
