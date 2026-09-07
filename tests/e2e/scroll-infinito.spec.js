import { expect, test } from '@playwright/test';

// scripts/e2e.mjs siembra, ademas de los 3 antojos normales, 15 productos
// "Antojo de scroll N" con availability:false y un createdAt viejo a
// proposito: ordenan despues de los 3 originales (availability desc,
// createdAt desc), asi que quedan repartidos entre la primera pagina
// (PAGE_SIZE=12 en ProductGrid.jsx) y la segunda. El desempate final es por
// _id desc, y los insertMany() generan ids crecientes en el mismo orden del
// array, asi que "scroll 1" (el primero insertado, el id mas chico entre los
// filler) queda de los ultimos en verse - solo deberia aparecer tras cargar
// la segunda pagina.
test.describe('scroll infinito en el listado (T-23)', () => {
  test('cargar mas al llegar al final trae la siguiente pagina', async ({ page }) => {
    await page.goto('/antojos');

    // Antes de scrollear: los 3 antojos originales siguen en la primera
    // pagina (no los desplazo el filler), y el filler mas "viejo" del lote
    // todavia no deberia estar.
    await expect(page.getByText('Arepa de queso').first()).toBeVisible();
    await expect(page.getByText('Antojo de scroll 1', { exact: true })).toHaveCount(0);

    await page.screenshot({ path: 'test-results/06-scroll-antes.png', fullPage: true });

    // El listado no scrollea la ventana: vive dentro de un contenedor propio
    // con overflow-y-scroll (Layout.jsx), asi que window.scrollTo no mueve
    // nada. scrollIntoViewIfNeeded encuentra el contenedor real y dispara el
    // IntersectionObserver del centinela al final de la lista.
    await page.getByText('Antojo de scroll 7', { exact: true }).scrollIntoViewIfNeeded();

    await expect(page.getByText('Antojo de scroll 1', { exact: true })).toBeVisible();

    await page.screenshot({ path: 'test-results/07-scroll-despues.png', fullPage: true });
  });
});
