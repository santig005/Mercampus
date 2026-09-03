import { expect, test } from '@playwright/test';

// Un screenshot por pantalla, numerado para que se lean en orden al abrir el
// artefacto del CI.
const shot = (page, name) =>
  page.screenshot({ path: `test-results/${name}.png`, fullPage: true });

// Ids del seed. Solo el vendedor aprobado y sus productos salen en publico.
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

    // Si la parrilla falla, la app pinta un error en su lugar y estos nombres
    // no aparecen. Son los tres antojos del vendedor aprobado.
    await expect(page.getByText('Arepa de queso').first()).toBeVisible();
    await expect(page.getByText('Buñuelo').first()).toBeVisible();
    await expect(page.getByText('Jugo de mango').first()).toBeVisible();

    // Del vendedor pendiente de aprobacion no debe salir nada.
    await expect(page.getByText('Brownie de chocolate')).toHaveCount(0);
    await expect(page.getByText('Galletas de avena')).toHaveCount(0);

    // Y el producto de marketplace no pertenece a esta seccion.
    await expect(page.getByText('Termo Mercampus')).toHaveCount(0);

    // Ningun modal debe quedar abierto al cargar.
    await expect(page.locator('dialog[open]')).toHaveCount(0);

    await shot(page, '02-listado-antojos');
  });

  test('el detalle de producto carga el producto sembrado', async ({ page }) => {
    await page.goto(`/antojos/${PRODUCT_ID}`);

    await expect(page.getByText('Arepa de queso').first()).toBeVisible();
    await expect(page.getByText('6,000').first()).toBeVisible();

    await shot(page, '03-detalle-producto');
  });

  test('el perfil del vendedor carga su negocio', async ({ page }) => {
    await page.goto(`/antojos/sellers/${SELLER_ID}`);

    await expect(page.getByText('Arepas El Parche').first()).toBeVisible();
    // Sus productos, no los del otro vendedor.
    await expect(page.getByText('Arepa de queso').first()).toBeVisible();
    await expect(page.getByText('Brownie de chocolate')).toHaveCount(0);

    await shot(page, '04-perfil-vendedor');
  });
});
