import { expect, test } from '@playwright/test';

// SellerPage.jsx (the direct /antojos/sellers/<id> URL) and SellerModal.jsx
// (the ?vendedor= dialog from T-167's modal stack) are near-twins that T-81's
// seller profile zone left untranslated: only their shared children
// (AvailabilityBadge, TableSchema) followed the locale. These read the
// rendered copy of both, in both locales, and screenshot it.
//
// Spanish is kept literal: modal-stack and seller-products-modal pin
// "¡Conoce todos los productos de este vendedor!" by text on the default
// locale.
const SELLER_ID = process.env.E2E_SELLER_ID; // 'Arepas El Parche' in the seed
const SELLER_NAME = 'Arepas El Parche';

const COPY = {
  es: {
    prefix: '',
    schedule: 'Horario',
    products: '¡Conoce todos los productos de este vendedor!',
    recommend: 'Recomendar a un amigo',
    close: 'Cerrar',
    whatsappText: `Hola ${SELLER_NAME}, te vi en Mercampus `,
  },
  en: {
    prefix: '/en',
    schedule: 'Schedule',
    products: "Check out all of this seller's products!",
    recommend: 'Recommend to a friend',
    close: 'Close',
    whatsappText: `Hi ${SELLER_NAME}, I saw you on Mercampus `,
  },
};

// The chrome both screens share: headings, contact buttons, the prefilled
// WhatsApp message and the share CTA.
async function expectSellerCopy(scope, copy) {
  await expect(scope.getByRole('heading', { name: SELLER_NAME })).toBeVisible();
  await expect(scope.getByRole('heading', { name: copy.schedule, exact: true })).toBeVisible();
  await expect(scope.getByRole('heading', { name: copy.products })).toBeVisible();
  await expect(scope.getByRole('link', { name: 'Instagram', exact: true })).toBeVisible();
  await expect(scope.getByRole('button', { name: copy.recommend })).toBeVisible();

  const whatsapp = scope.getByRole('link', { name: 'WhatsApp', exact: true });
  await expect(whatsapp).toBeVisible();
  const href = await whatsapp.getAttribute('href');
  expect(new URL(href).searchParams.get('text')).toBe(copy.whatsappText);
}

test.describe('the seller page and seller modal follow the page locale', () => {
  for (const locale of ['es', 'en']) {
    const copy = COPY[locale];

    test(`${locale}: seller page`, async ({ page }) => {
      await page.goto(`${copy.prefix}/antojos/sellers/${SELLER_ID}`);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);

      await expectSellerCopy(page.locator('#seller_page'), copy);

      await page.screenshot({ path: `test-results/seller-page-i18n-${locale}.png` });
    });

    test(`${locale}: seller modal (cold ?vendedor=)`, async ({ page }) => {
      await page.goto(`${copy.prefix}/antojos?vendedor=${SELLER_ID}`);
      const dialog = page.locator('dialog[open]');

      await expectSellerCopy(dialog, copy);
      // Scoped to the modal's action row: the ShareButton sheet mounted in
      // the same dialog has a "Close" of its own.
      await expect(
        dialog.locator('.modal-action').getByRole('button', { name: copy.close, exact: true })
      ).toBeVisible();

      await page.screenshot({ path: `test-results/seller-modal-i18n-${locale}.png` });
    });
  }
});
