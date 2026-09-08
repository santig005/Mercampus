import { expect, test } from '@playwright/test';

// T-87 (audit finding F16). The /about topbar is sticky and transparent so the
// hero shows through it. Past the hero it stayed transparent and the wordmark,
// the language switcher and the CTA printed on top of the section text.
const topbar = page => page.locator('header[data-scrolled]');

const backgroundOf = locator =>
  locator.evaluate(element => getComputedStyle(element).backgroundColor);

const isTransparent = color => /rgba\([^)]*,\s*0\s*\)/.test(color);

test.describe('/about sticky topbar (T-87)', () => {
  test('transparent over the hero, opaque once the page scrolls', async ({ page }) => {
    await page.goto('/about');

    // At the top it must stay see-through: the negative margin puts it over
    // the hero on purpose, and a solid bar there would be a worse design, not
    // a fix.
    await expect(topbar(page)).toHaveAttribute('data-scrolled', 'false');
    expect(isTransparent(await backgroundOf(topbar(page)))).toBe(true);

    await page.mouse.wheel(0, 900);

    await expect(topbar(page)).toHaveAttribute('data-scrolled', 'true');
    expect(isTransparent(await backgroundOf(topbar(page)))).toBe(false);

    // The bar is still where it was - a surface, not a layout change.
    await expect(topbar(page)).toBeInViewport();

    await page.screenshot({ path: 'test-results/12-about-topbar-scrolled.png' });
  });

  test('scrolling back to the top puts the hero back behind it', async ({ page }) => {
    await page.goto('/about');
    await page.mouse.wheel(0, 900);
    await expect(topbar(page)).toHaveAttribute('data-scrolled', 'true');

    await page.mouse.wheel(0, -900);

    await expect(topbar(page)).toHaveAttribute('data-scrolled', 'false');
    expect(isTransparent(await backgroundOf(topbar(page)))).toBe(true);
  });

  // F17 was exactly this page's hero looking fine in light and being unreadable
  // in dark, so the surface gets looked at in both themes rather than trusted
  // because it is written with tokens.
  test('the surface follows the theme into dark mode', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    await page.goto('/about');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.mouse.wheel(0, 900);
    await expect(topbar(page)).toHaveAttribute('data-scrolled', 'true');

    const background = await backgroundOf(topbar(page));
    expect(isTransparent(background)).toBe(false);
    // base-100 in dark is #241D17: if the bar ever resolves to a light surface
    // here, the tokens are not being read.
    expect(background).not.toMatch(/^rgba?\(2[45][0-9], 2[45][0-9], 2[45][0-9]/);

    await page.screenshot({ path: 'test-results/13-about-topbar-scrolled-dark.png' });
  });
});
