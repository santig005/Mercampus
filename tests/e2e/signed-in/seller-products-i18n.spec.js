import { expect, test } from '@playwright/test';

// T-81 (seller products zone): /antojos/product/add and
// /antojos/sellers/products/edit(/[id]) under [locale].
//
// Runs with the T-84 session, the seeded owner of "Arepas El Parche" - an
// APPROVED seller, which is exactly who these three screens are for, so
// unlike the onboarding zone spec there is no fixture state to flip first.
const PRODUCT_ID = process.env.E2E_PRODUCT_ID;
const PRODUCT_NAME = 'Arepa de queso';

test.describe('i18n on the seller products zone (T-81)', () => {
  test.beforeAll(() => {
    expect(PRODUCT_ID, 'E2E_PRODUCT_ID is set by scripts/e2e.mjs').toBeTruthy();
  });

  test('add-product, in Spanish (default, no prefix)', async ({ page }) => {
    await page.goto('/antojos/product/add');

    await expect(
      page.getByRole('heading', { name: 'Agrega aquí tu producto' })
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByText('Por favor completa la información del producto')).toBeVisible();
    await expect(page.getByPlaceholder('Nombre del producto')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Subir Producto' })).toBeVisible();
    // A protected form screen: the switcher hides here too (isProtectedPath).
    await expect(page.getByRole('link', { name: 'English' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Español' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/t81-products-add-es.png', fullPage: true });
  });

  test('add-product, in English via /en', async ({ page }) => {
    await page.goto('/en/antojos/product/add');

    await expect(
      page.getByRole('heading', { name: 'Add your product here' })
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText("Please fill in the product's information")).toBeVisible();
    await expect(page.getByPlaceholder('Product name')).toBeVisible();
    await expect(page.getByText('Antojos (Food products)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload Product' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'English' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Español' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/t81-products-add-en.png', fullPage: true });
  });

  test('product list, in Spanish (default, no prefix)', async ({ page }) => {
    await page.goto('/antojos/sellers/products/edit');

    await expect(page.getByRole('heading', { name: 'Editar tus Productos' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('button', { name: 'Añadir Producto' })).toBeVisible();
    await expect(page.getByText('Mi disponibilidad')).toBeVisible();
    await expect(page.getByText(PRODUCT_NAME)).toBeVisible();
    await page.screenshot({ path: 'test-results/t81-products-list-es.png', fullPage: true });
  });

  test('product list, in English via /en - internal links keep the locale', async ({
    page,
  }) => {
    await page.goto('/en/antojos/sellers/products/edit');

    await expect(
      page.getByRole('heading', { name: 'Edit your Products', exact: true })
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const addButton = page.getByRole('button', { name: 'Add Product' });
    await expect(addButton).toBeVisible();
    await expect(page.getByText('My availability')).toBeVisible();
    await page.screenshot({ path: 'test-results/t81-products-list-en.png', fullPage: true });

    // The "Add Product" navigation is a router.push through localizedHref,
    // not a plain path - this is the exact bug PR #363 fixed for SidebarBtn:
    // without it, this button would drop the visitor back into Spanish.
    await addButton.click();
    await expect(page).toHaveURL(/\/en\/antojos\/product\/add$/);

    await page.goBack();
    await expect(page).toHaveURL(/\/en\/antojos\/sellers\/products\/edit$/);

    // Same for the product card's own link.
    await page.getByText(PRODUCT_NAME).first().click();
    await expect(page).toHaveURL(
      new RegExp(`/en/antojos/sellers/products/edit/${PRODUCT_ID}$`)
    );
  });

  test('product edit form, in Spanish (default, no prefix)', async ({ page }) => {
    await page.goto(`/antojos/sellers/products/edit/${PRODUCT_ID}`);

    await expect(page.getByRole('heading', { name: 'Edita tu producto' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByLabel('Nombre')).toHaveValue(PRODUCT_NAME);
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Eliminar Producto' })).toBeVisible();
    await page.screenshot({ path: 'test-results/t81-products-edit-es.png', fullPage: true });
  });

  test('product edit form, in English via /en', async ({ page }) => {
    await page.goto(`/en/antojos/sellers/products/edit/${PRODUCT_ID}`);

    await expect(page.getByRole('heading', { name: 'Edit your product' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByLabel('Name')).toHaveValue(PRODUCT_NAME);
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete Product' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'English' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Español' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/t81-products-edit-en.png', fullPage: true });
  });

  // A malformed id still reaches this zone's own [locale] page directly (its
  // segments match the file route regardless of isIntlRoute, which only
  // decides whether a BARE, unprefixed request gets rewritten here) - and
  // that page's own getProductForEdit check 404s it, same as the bare path
  // always has. What the dynamic LOCALIZED_ROUTES entry actually guards
  // against - a bare id like this being wrongly prefixed at all - is covered
  // in tests/unit/routing.test.js, which can assert the string directly.
  test('a malformed product id 404s instead of rendering the edit form', async ({
    page,
  }) => {
    await page.goto('/en/antojos/sellers/products/edit/not-an-object-id');

    await expect(page.getByRole('button', { name: 'Save Changes' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Ver los antojos' })).toBeVisible();
  });
});
