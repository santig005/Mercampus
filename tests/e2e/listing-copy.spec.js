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
    // on the happy string. (h1 since T-152 - the greeting is the page heading.)
    await expect(page.locator('h1, h2', { hasText: 'Hola,' })).toHaveCount(0);
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

// T-152: /antojos is where `/` lands, and it had no <h1> at all (the greeting
// was an <h2>) and inherited the root layout's generic title and
// description, because a 'use client' page cannot export metadata.
test.describe('antojos page heading and metadata (T-152)', () => {
  for (const { path, h1, title, description } of [
    {
      path: '/antojos',
      h1: 'Calma tus antojos',
      title: 'Antojos · Mercampus',
      description: /^Comida hecha por estudiantes/,
    },
    {
      path: '/en/antojos',
      h1: 'Soothe your cravings',
      title: 'Cravings · Mercampus',
      description: /^Food made by students/,
    },
  ]) {
    test(`${path}: exactly one h1, and its own title and description`, async ({ page }) => {
      await page.goto(path);

      const headings = page.locator('h1');
      await expect(headings).toHaveCount(1);
      await expect(headings).toHaveText(h1);

      await expect(page).toHaveTitle(title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        description
      );
    });
  }
});
