import { expect, test } from '@playwright/test';

// T-123. "Jugo de mango" is switched off in the seed (scripts/seed.mjs), so it
// is "No disponible" at any hour - the one seeded antojo whose block does not
// depend on when CI happens to run against the seller's schedule.
const filterButton = (page, name) =>
  page
    .getByRole('group', { name: 'Filtrar por disponibilidad' })
    .getByRole('button', { name });

const searchBox = page => page.getByPlaceholder('Busca tu antojo más deseado');

test.describe('availability filter (T-123)', () => {
  test('both options start selected and nothing is filtered out', async ({ page }) => {
    await page.goto('/antojos');

    await expect(filterButton(page, 'Disponibles ahora')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(filterButton(page, 'No disponibles')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.getByText('Jugo de mango').first()).toBeVisible();
    await expect(page).not.toHaveURL(/availability=/);
  });

  test('deselecting "No disponibles" filters the listing and writes the URL', async ({
    page,
  }) => {
    await page.goto('/antojos');
    await expect(page.getByText('Jugo de mango').first()).toBeVisible();

    await filterButton(page, 'No disponibles').click();

    await expect(page).toHaveURL(/availability=available/);
    await expect(filterButton(page, 'No disponibles')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    await expect(page.getByText('Jugo de mango')).toHaveCount(0);

    // The last selected option can't be deselected: "neither" would be empty.
    await filterButton(page, 'Disponibles ahora').click();
    await expect(filterButton(page, 'Disponibles ahora')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // Selecting the other one again is "both", written as no param.
    await filterButton(page, 'No disponibles').click();
    await expect(page).not.toHaveURL(/availability=/);
    await expect(page.getByText('Jugo de mango').first()).toBeVisible();
  });

  test('a shared filtered link keeps its filter, and typing a search does not drop it', async ({
    page,
  }) => {
    await page.goto('/antojos?availability=unavailable');

    await expect(filterButton(page, 'Disponibles ahora')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    await expect(page.getByText('Jugo de mango').first()).toBeVisible();

    // SearchBox rebuilds the whole query string on every keystroke.
    await searchBox(page).fill('mango');
    await expect(page).toHaveURL(/product=mango/);
    await expect(page).toHaveURL(/availability=unavailable/);
    await expect(page.getByText('Jugo de mango').first()).toBeVisible();
  });
});
