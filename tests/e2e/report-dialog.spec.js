import { expect, test } from '@playwright/test';

// T-149: the "Reportar" dialog on the product detail page
// (/antojos/[id], /marketplace/[id] - ProductPage.jsx) and the seller page
// (/antojos/sellers/[id] - SellerPage.jsx). Both reach it through the same
// shared src/components/reports/ReportDialog.jsx.
//
// Visual verification per CLAUDE.md rule 3: `bg-primary` renders a fixed
// near-white in both themes (public/css/main.css), not the brand orange, so
// a test that only read the class string would not have caught T-100's
// regression. These are real screenshots, in light and dark theme
// (?theme=dark - the anti-FOUC script in src/app/layout.jsx), looked at
// before merging.
const PRODUCT_ID = process.env.E2E_PRODUCT_ID;
const SELLER_ID = process.env.E2E_SELLER_ID;

// ProductPage/SellerPage's own wrapping <dialog> never calls showModal() (it
// is forced visible by daisyUI's `modal-open` CSS class instead), so
// `dialog[open]` only ever matches this one, native-opened dialog - no need
// to filter by text. That filter used to be here, and it broke the "shows
// the success state" test below: once submission succeeds, the dialog's own
// text no longer contains "Reportar" (the title becomes "¡Reporte
// enviado!"), so a `hasText: 'Reportar'` filter stops matching it.
const openReportDialog = async page => {
  await page.getByRole('button', { name: /Reportar/ }).click();
  return page.locator('dialog[open]');
};

for (const theme of ['light', 'dark']) {
  const suffix = theme === 'dark' ? '?theme=dark' : '';

  test.describe(`report dialog on the product page (${theme})`, () => {
    test(`opens with every control labelled and reachable (${theme})`, async ({ page }) => {
      await page.goto(`/antojos/${PRODUCT_ID}${suffix}`);

      const dialog = await openReportDialog(page);

      await expect(dialog.getByRole('heading', { name: 'Reportar' })).toBeVisible();
      await expect(dialog.getByLabel('Motivo')).toBeVisible();
      await expect(dialog.getByLabel('Detalles (opcional)')).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Enviar reporte' })).toBeDisabled();
      await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeEnabled();

      await page.screenshot({
        path: `test-results/report-dialog-product-${theme}.png`,
        fullPage: true,
      });
    });

    test(`picking a reason enables the submit button (${theme})`, async ({ page }) => {
      await page.goto(`/antojos/${PRODUCT_ID}${suffix}`);
      const dialog = await openReportDialog(page);

      await dialog.getByLabel('Motivo').selectOption('wrong_price');

      await expect(dialog.getByRole('button', { name: 'Enviar reporte' })).toBeEnabled();
    });

    test(`cancel closes the dialog (${theme})`, async ({ page }) => {
      await page.goto(`/antojos/${PRODUCT_ID}${suffix}`);
      const dialog = await openReportDialog(page);

      await dialog.getByRole('button', { name: 'Cancelar' }).click();

      await expect(page.locator('dialog[open]')).toHaveCount(0);
    });
  });

  test.describe(`report dialog on the seller page (${theme})`, () => {
    test(`opens with every control labelled and reachable (${theme})`, async ({ page }) => {
      await page.goto(`/antojos/sellers/${SELLER_ID}${suffix}`);

      const dialog = await openReportDialog(page);

      await expect(dialog.getByRole('heading', { name: 'Reportar' })).toBeVisible();
      await expect(dialog.getByLabel('Motivo')).toBeVisible();
      await expect(dialog.getByLabel('Detalles (opcional)')).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Enviar reporte' })).toBeDisabled();

      await page.screenshot({
        path: `test-results/report-dialog-seller-${theme}.png`,
        fullPage: true,
      });
    });
  });
}

// One real submission, on the light theme only - the in-memory e2e database
// is a throwaway (scripts/e2e.mjs), so writing to it is safe, and this is
// the only way to see the success state render for real rather than asserting
// it from the component test's mocked fetch.
test('submitting a report shows the success state', async ({ page }) => {
  await page.goto(`/antojos/${PRODUCT_ID}`);
  const dialog = await openReportDialog(page);

  await dialog.getByLabel('Motivo').selectOption('other');
  await dialog.getByRole('button', { name: 'Enviar reporte' }).click();

  await expect(dialog.getByRole('heading', { name: '¡Reporte enviado!' })).toBeVisible();

  await page.screenshot({ path: 'test-results/report-dialog-success.png', fullPage: true });
});
