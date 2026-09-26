import { expect, test } from '@playwright/test';

// T-119. The add-product page used to read only `errorData.message` and show
// the generic "Datos inválidos" for every 400, even though the API already
// names the offending fields in `fields` (see invalidPayload in
// src/lib/api-response.ts). That is why a price-format bug (T-115) looked
// like an opaque error for ten days. This asserts the per-field messages
// actually render, and captures the real screenshot rule 3 asks for instead
// of a test that only greps for a class name.
//
// T-127: this same dialog had a second bug found while capturing those
// screenshots - `.modal-box` was hardcoded to a light-pink hex with no dark
// variant, so the text (falling back to `base-content`) was nearly invisible
// in the dark theme. The fix (`alert alert-error`, the same themed token
// EditProductForm.jsx already used) is verified here two ways: a computed
// contrast-ratio check (so a class-name-only assertion can't go green on a
// broken render the way T-100 did), and a real screenshot per theme, now
// saved under docs/audits/t-127/ instead of t-119's folder - t-119's own
// `error-state__*.png` stay untouched as committed evidence of the original
// bug (see that folder's README) rather than being overwritten by this spec.
function relativeLuminance([r, g, b]) {
  const channel = c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [rl, gl, bl] = [r, g, b].map(channel);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(rgbA, rgbB) {
  const lA = relativeLuminance(rgbA);
  const lB = relativeLuminance(rgbB);
  const [lighter, darker] = lA > lB ? [lA, lB] : [lB, lA];
  return (lighter + 0.05) / (darker + 0.05);
}

// Runs inside the page: getComputedStyle can serialize daisyUI's oklch()
// colors back out as oklch() rather than rgb() depending on the browser, so
// this reads the actual painted pixel through a 1x1 canvas instead of
// parsing the string - canvas getImageData is always rgb regardless of the
// CSS colour function used to set fillStyle.
function readBoxColorsInPage(selector) {
  const el = document.querySelector(selector);
  const style = getComputedStyle(el);
  const toRgb = css => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
  };
  return {
    background: toRgb(style.backgroundColor),
    text: toRgb(style.color),
  };
}

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

      // T-127: the dialog's background used to be a hardcoded light pink
      // with no dark variant, and its text fell back to base-content -
      // nearly invisible on that pink in the dark theme (see
      // docs/audits/t-119/error-state__dark.png, the "before" evidence).
      // This checks the actual painted pixels, not the class name, so a fix
      // that changes the class but not the render (T-100's failure mode)
      // would still fail here.
      const colors = await page.evaluate(readBoxColorsInPage, '#errors .alert-error');
      const ratio = contrastRatio(colors.background, colors.text);
      expect(ratio, `background ${colors.background} vs text ${colors.text} in ${theme} theme`).toBeGreaterThanOrEqual(4.5);

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
        path: `docs/audits/t-127/error-state__${theme}.png`,
        fullPage: true,
      });
    });
  }
});
