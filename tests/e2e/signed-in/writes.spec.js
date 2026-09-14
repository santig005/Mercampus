import { expect, test } from '@playwright/test';

// T-112b. The seller's writes - saving a product, its availability switch,
// deleting it, saving the seller profile - had no spec at all: product-edit and
// seller-screens only open the forms. That is how saving or deleting from the
// full product form could answer 401 unnoticed: EditProductForm called
// updateProduct/deleteProduct without the Bearer token apiToken.js needs, while
// the list page's switch passed one.
//
// Runs with the T-84 session (the seeded owner of "Arepas El Parche"). It works
// on a product it creates for itself, so no other spec's seeded names change
// under it: the suite runs serially and several specs assert on those by name.
// Marketplace, so it never shows up in the /antojos listing specs either.
// Every write is checked by reloading, not by watching the network: before
// T-112b these calls were Server Actions, invisible as /api requests.

const PRODUCTS = '/antojos/sellers/products/edit';

// Not serial on purpose: each write should report on its own, so a failed save
// does not hide whether delete works. Tests still run in file order (one
// worker), but Playwright restarts the worker after a failure and re-imports
// this file - so the name comes from the run's fixture email, unique per run
// and stable across those restarts, never from Date.now().
const runId = process.env.E2E_CLERK_EMAIL?.match(/e2e\.([^+]+)\+/)?.[1] ?? 'local';
const name = `Producto e2e T-112b ${runId}`;

async function openOwnProduct(page) {
  await page.goto(PRODUCTS);
  await page.getByText(name).first().click();
  await expect(page).toHaveURL(/products\/edit\/[a-f\d]{24}/);
  await expect(page.getByLabel('Nombre')).toHaveValue(name);
}

test.describe('seller writes reach the API with the session (T-112b)', () => {
  test('a disposable product is created for this spec', async ({ page }) => {
    await page.goto(PRODUCTS);
    await expect(page.getByRole('button', { name: 'Añadir Producto' })).toBeVisible();

    const status = await page.evaluate(async productName => {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          price: 1000,
          description: 'Creado por el e2e de T-112b.',
          images: ['https://ik.imagekit.io/seed/e2e.jpg'],
          section: 'marketplace',
          category: ['Accesorios'],
          availability: false,
        }),
      });
      return response.status;
    }, name);

    expect(status).toBe(201);
  });

  test('saving the full product form persists the change', async ({ page }) => {
    await openOwnProduct(page);

    const description = `Guardado desde el formulario ${Date.now()}`;
    await page.getByLabel('Descripcion').fill(description);
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    await expect(page.getByText('Error al actualizar el producto.')).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${PRODUCTS}$`));

    await openOwnProduct(page);
    await expect(page.getByLabel('Descripcion')).toHaveValue(description);
  });

  test("a product's availability switch persists", async ({ page }) => {
    await page.goto(PRODUCTS);
    const toggle = page.getByRole('checkbox', {
      name: new RegExp(`Disponibilidad de ${name}`),
    });
    await expect(toggle).not.toBeChecked();

    // Wait for the write itself before reloading, or the reload cancels it.
    // Matches both shapes it has had: a Server Action POST (apiToken.js) and a
    // PUT to the API (T-112b).
    const write = page.waitForResponse(response => {
      const request = response.request();
      return (
        (request.method() === 'PUT' && response.url().includes('/api/products/')) ||
        (request.method() === 'POST' && Boolean(request.headers()['next-action']))
      );
    });
    await toggle.click();
    await expect(toggle).toBeChecked();
    expect((await write).ok()).toBe(true);

    await expect
      .poll(
        async () => {
          await page.reload();
          return page
            .getByRole('checkbox', { name: new RegExp(`Disponibilidad de ${name}`) })
            .isChecked();
        },
        { timeout: 30_000 }
      )
      .toBe(true);
  });

  test('saving the seller profile form persists the change', async ({ page }) => {
    await page.goto('/antojos/sellers/profile/edit');
    await expect(page.getByLabel('Nombre del Negocio')).toHaveValue('Arepas El Parche');

    const slogan = `Eslogan e2e ${Date.now()}`;
    await page.getByLabel('Eslogan').fill(slogan);
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    await expect(page.getByText('Error al actualizar el perfil del vendedor.')).toHaveCount(0);
    await expect(page).not.toHaveURL(/profile\/edit/);

    await page.goto('/antojos/sellers/profile/edit');
    await expect(page.getByLabel('Eslogan')).toHaveValue(slogan);
  });

  test('deleting the product removes it', async ({ page }) => {
    await openOwnProduct(page);

    await page.getByRole('button', { name: 'Eliminar Producto' }).click();

    await expect(page.getByText('Error al eliminar el producto.')).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${PRODUCTS}$`));

    await page.reload();
    await expect(page.getByRole('button', { name: 'Añadir Producto' })).toBeVisible();
    await expect(page.getByText(name)).toHaveCount(0);
  });
});
