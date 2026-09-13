import { expect, test } from '@playwright/test';

// T-88 (audit findings F21 and F22). Both listings render the same header:
// a greeting and a search box. Signed out the greeting kept a comma waiting
// for a name, and /marketplace asked for "tu antojo mas deseado" because the
// placeholder was hardcoded to the section SearchBox was written for.
//
// Playwright has no Clerk session (T-84), so these cover the signed-out half.
// The signed-in greeting - "Hola <name>, calma tus antojos" - is untested.

test.describe('listing header copy (T-88)', () => {
  test('antojos: the greeting stands on its own without a name', async ({ page }) => {
    await page.goto('/antojos');

    const heading = page.getByRole('heading', { name: /antojos/i }).first();
    await expect(heading).toHaveText('Calma tus antojos');

    // The regression is the comma, so assert on it directly rather than only
    // on the happy string.
    await expect(page.locator('h2', { hasText: 'Hola,' })).toHaveCount(0);
  });

  test('marketplace: its own greeting and its own search placeholder', async ({ page }) => {
    await page.goto('/marketplace');

    await expect(
      page.getByRole('heading', { name: 'Explora el marketplace' })
    ).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Hola,' })).toHaveCount(0);

    await expect(page.getByPlaceholder('Busca en el marketplace')).toBeVisible();
    await expect(page.getByPlaceholder(/antojo/i)).toHaveCount(0);
  });

  test('antojos keeps its own placeholder', async ({ page }) => {
    await page.goto('/antojos');

    await expect(page.getByPlaceholder('Busca tu antojo más deseado')).toBeVisible();
  });
});
