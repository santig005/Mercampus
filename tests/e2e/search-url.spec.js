import { expect, test } from '@playwright/test';

// T-92 (audit finding F3). SearchBox rebuilt the query string from its own
// state on mount, and on mount that state was empty - so it pushed a URL with
// no `product`, wiping the param ProductGrid reads one line later. A shared or
// reloaded search came back as the full listing, with an empty box, and the
// param gone from the address bar.
//
// The approved seller's antojos are "Arepa de queso", "Bunuelo" and "Jugo de
// mango" (scripts/seed.mjs), so "arepa" is a search that matches exactly one
// of them. "Jugo de mango" is the one asserted as filtered out - plain ASCII,
// unlike "Bunuelo", so the assertion does not hinge on an accent.
const searchBox = page => page.getByPlaceholder('Busca tu antojo más deseado');

test.describe('search survives a URL (T-92)', () => {
  test('a shared search URL keeps its param, its box and its filter', async ({
    page,
  }) => {
    await page.goto('/antojos?product=arepa');

    // The param is still in the address bar a moment later - the push that
    // wiped it was debounced, so an immediate assertion would have passed
    // even before the fix.
    await expect(searchBox(page)).toHaveValue('arepa');
    await expect(page.getByText('Arepa de queso').first()).toBeVisible();
    await expect(page.getByText('Jugo de mango')).toHaveCount(0);

    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/product=arepa/);
    await expect(searchBox(page)).toHaveValue('arepa');
    await expect(page.getByText('Jugo de mango')).toHaveCount(0);
  });

  test('a reload keeps the search', async ({ page }) => {
    await page.goto('/antojos?product=arepa');
    await page.reload();

    await expect(searchBox(page)).toHaveValue('arepa');
    await expect(page).toHaveURL(/product=arepa/);
  });

  test('typing still writes the URL, and clearing still clears it', async ({ page }) => {
    await page.goto('/antojos');

    await searchBox(page).fill('arepa');
    await expect(page).toHaveURL(/product=arepa/);
    await expect(page.getByText('Jugo de mango')).toHaveCount(0);

    await searchBox(page).fill('');
    await expect(page).not.toHaveURL(/product=/);
    await expect(page.getByText('Jugo de mango').first()).toBeVisible();
  });

  test('a search that matches nothing says so, with the box still filled', async ({
    page,
  }) => {
    await page.goto('/antojos?product=zzzzqq');

    await expect(searchBox(page)).toHaveValue('zzzzqq');
    await expect(page.getByText('Arepa de queso')).toHaveCount(0);
  });
});
