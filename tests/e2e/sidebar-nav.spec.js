import { expect, test } from '@playwright/test';

// T-89 (audit finding F26). The sidebar item for the page you are on rendered
// as an <a> with its href commented out: not a link to the browser, so not
// focusable, not in the tab order, and with nothing but a background color
// saying it is the current page.
const openSidebar = async page => {
  await page.locator('label[for="my-dibujador"]').first().click();
};

const item = (page, name) => page.getByRole('link', { name, exact: true });

test.describe('sidebar current item (T-89)', () => {
  test('the current page is a real link, marked as current', async ({ page }) => {
    await page.goto('/antojos');
    await openSidebar(page);

    const current = item(page, 'Antojitos');
    await expect(current).toBeVisible();
    await expect(current).toHaveAttribute('aria-current', 'page');
    await expect(current).toHaveAttribute('href', '/antojos');

    // The half of F26 that a role assertion alone would miss: an <a> without
    // href is still exposed as generic and cannot take focus.
    await current.focus();
    await expect(current).toBeFocused();
  });

  test('the other items are links too, and not marked as current', async ({ page }) => {
    await page.goto('/antojos');
    await openSidebar(page);

    const other = item(page, 'Marketplace');
    await expect(other).toHaveAttribute('href', '/marketplace');
    await expect(other).not.toHaveAttribute('aria-current', 'page');
  });

  test('current follows the page you are on', async ({ page }) => {
    await page.goto('/marketplace');
    await openSidebar(page);

    await expect(item(page, 'Marketplace')).toHaveAttribute('aria-current', 'page');
    await expect(item(page, 'Antojitos')).not.toHaveAttribute('aria-current', 'page');
  });
});
