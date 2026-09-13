import { expect, test } from '@playwright/test';

// One screenshot per screen, numbered so they read in order when the CI
// artifact is opened.
const shot = (page, name) =>
  page.screenshot({ path: `test-results/${name}.png`, fullPage: true });

// Seed ids. Only the approved seller and its products show up publicly.
const PRODUCT_ID = process.env.E2E_PRODUCT_ID;
const SELLER_ID = process.env.E2E_SELLER_ID;

test.describe('recorrido publico', () => {
  test('home redirige al listado de antojos', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/antojos$/);
    await expect(page.getByText('calma tus antojos')).toBeVisible();

    await shot(page, '01-home');
  });

  test('el listado muestra solo los productos publicables', async ({ page }) => {
    await page.goto('/antojos');

    // If the grid fails, the app paints an error in its place and these names
    // do not appear. They are the approved seller's three antojos.
    await expect(page.getByText('Arepa de queso').first()).toBeVisible();
    await expect(page.getByText('Buñuelo').first()).toBeVisible();
    await expect(page.getByText('Jugo de mango').first()).toBeVisible();

    // Nothing from the seller awaiting approval should show up.
    await expect(page.getByText('Brownie de chocolate')).toHaveCount(0);
    await expect(page.getByText('Galletas de avena')).toHaveCount(0);

    // And the marketplace product does not belong to this section.
    await expect(page.getByText('Termo Mercampus')).toHaveCount(0);

    // No modal should be left open on load.
    await expect(page.locator('dialog[open]')).toHaveCount(0);

    await shot(page, '02-listado-antojos');
  });

  test('el detalle de producto carga el producto sembrado', async ({ page }) => {
    await page.goto(`/antojos/${PRODUCT_ID}`);

    await expect(page.getByText('Arepa de queso').first()).toBeVisible();
    // Price in Colombian pesos: thousands separated by a dot, not a comma.
    await expect(page.getByText(/\$\s*6\.000/).first()).toBeVisible();
    await expect(page.getByText('6,000')).toHaveCount(0);

    // T-69: a shared link has to carry its own preview, not the root layout's
    // generic one (the same title and image for every page).
    await expect(page).toHaveTitle('Arepa de queso · Mercampus');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Arepa de queso · Mercampus'
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);

    await shot(page, '03-detalle-producto');
  });

  test('el perfil del vendedor carga su negocio', async ({ page }) => {
    await page.goto(`/antojos/sellers/${SELLER_ID}`);

    await expect(page.getByText('Arepas El Parche').first()).toBeVisible();
    // Its own products, not the other seller's.
    await expect(page.getByText('Arepa de queso').first()).toBeVisible();
    await expect(page.getByText('Brownie de chocolate')).toHaveCount(0);

    // T-69: same case as the product detail, for the seller profile.
    await expect(page).toHaveTitle('Arepas El Parche · Mercampus');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Arepas El Parche · Mercampus'
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);

    await shot(page, '04-perfil-vendedor');
  });

  test('el listado de vendedores muestra las tarjetas de negocio', async ({ page }) => {
    // The only public screen that renders SellerCard (via SellerGrid). The
    // product detail and the seller profile do not use it.
    await page.goto('/antojos/sellers/list');

    await expect(page.getByText('Arepas El Parche').first()).toBeVisible();
    await expect(page.getByText('De la plancha a tu clase').first()).toBeVisible();

    // The pending seller does not show in this view, but the filter lives in
    // SellerGrid.jsx (cliente), no en GET /api/sellers: la API sigue
    // returning every seller without filtering by `approved`. Anyone calling
    // the API directly (not through this page) sees them. See the note in the
    // ROADMAP.
    await expect(page.getByText('Postres Laura')).toHaveCount(0);

    await shot(page, '05-listado-vendedores');
  });
});
