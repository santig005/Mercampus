import { expect, test } from '@playwright/test';

// T-119. The add-product page used to read only `errorData.message` and show
// the generic "Datos inválidos" for every 400, even though the API already
// names the offending fields in `fields` (see invalidPayload in
// src/lib/api-response.ts). That is why a price-format bug (T-115) looked
// like an opaque error for ten days. This asserts the per-field messages
// actually render, and captures the real screenshot rule 3 asks for instead
// of a test that only greps for a class name.
test.describe('add-product shows which field failed (T-119)', () => {
  for (const theme of ['light', 'dark']) {
    test(`the error dialog lists the field messages, not just the generic one (${theme})`, async ({
      page,
    }) => {
      if (theme === 'dark') {
        await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
      }

      await page.goto('/antojos/product/add');
      await expect(page).not.toHaveURL(/auth\/login/);

      // The price input is now controlled (value={formData.price}): typing
      // into it and reading it back proves the value survives a re-render,
      // which an uncommented-out `value` would not.
      const priceInput = page.getByPlaceholder('Precio del producto');
      await priceInput.fill('15000');
      await expect(priceInput).toHaveValue(/15\.000|15000/);

      await page.getByPlaceholder('Nombre del producto').fill('Producto de prueba T-119');
      // Description, category and images are left empty on purpose: all three
      // are required server-side but not by the browser, so this reaches the
      // API and comes back with three named fields in one response.

      await page.getByRole('button', { name: 'Subir Producto' }).click();

      const dialog = page.locator('#errors');
      await expect(dialog).toHaveClass(/modal-open/);
      await expect(dialog.getByText('¡Atención!')).toBeVisible();

      // The old, generic-only behaviour: this is the failure this test would
      // have caught - a field list with at least a category/description/
      // images entry, not just "Datos inválidos" on its own.
      await expect(dialog.locator('li')).not.toHaveCount(0);
      await expect(dialog.getByText('category:', { exact: false })).toBeVisible();
      await expect(dialog.getByText('images:', { exact: false })).toBeVisible();

      // Park the pointer away and drop focus before the shot: a resting
      // :hover/:focus state on the button just clicked is not what a real
      // visitor sees a moment later (the false alarm ruled out in T-123).
      await page.mouse.move(0, 0);
      await page.evaluate(() => {
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      });

      await page.screenshot({
        path: `docs/audits/t-119/error-state__${theme}.png`,
        fullPage: true,
      });
    });
  }
});
