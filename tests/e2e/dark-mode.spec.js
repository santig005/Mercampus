import { expect, test } from '@playwright/test';

// T-73. The switcher lives in the side menu (SideBar), behind the hamburger
// button - there is no direct route to it.
const openSidebar = async page => {
  await page.locator('label[for="my-dibujador"]').first().click();
};

const themeToggle = page => page.getByLabel('Alternar modo oscuro');

test.describe('modo oscuro (T-73)', () => {
  test('el switcher cambia data-theme y lo guarda en localStorage', async ({ page }) => {
    await page.goto('/antojos');

    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark');

    await openSidebar(page);
    await expect(themeToggle(page)).toBeVisible();
    await themeToggle(page).click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('theme')))
      .toBe('dark');

    await page.screenshot({ path: 'test-results/08-modo-oscuro.png', fullPage: true });
  });

  test('el tema persiste entre recargas sin parpadeo (script anti-FOUC)', async ({ page }) => {
    await page.goto('/antojos');
    await openSidebar(page);
    await themeToggle(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // addInitScript runs before any of the page's own scripts, so this observes
    // what a real visitor sees: the attribute set by layout.jsx's anti-FOUC
    // script, before React hydrates.
    await page.addInitScript(() => {
      window.__themeAtDOMContentLoaded = null;
      document.addEventListener('DOMContentLoaded', () => {
        window.__themeAtDOMContentLoaded =
          document.documentElement.getAttribute('data-theme');
      });
    });
    await page.reload();

    await expect
      .poll(() => page.evaluate(() => window.__themeAtDOMContentLoaded))
      .toBe('dark');
  });

  test('un segundo click vuelve a modo claro', async ({ page }) => {
    await page.goto('/antojos');
    await openSidebar(page);
    await themeToggle(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await themeToggle(page).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('theme')))
      .toBe('light');
  });
});
