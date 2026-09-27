import { expect, test } from '@playwright/test';

// ProductModal.jsx - the dialog a product opens from the listing
// (?producto=, T-167's modal stack) - postdates T-81's product detail zone,
// which only translated ProductPage.jsx (the direct /antojos/<id> URL). So an
// English visitor clicking a product got a Spanish dialog. These open it the
// way a buyer does and read the rendered copy, in both locales, plus the
// error state a cold ?producto= for a missing product lands on.
//
// Spanish is kept literal: modal-stack, recorrido and seller-products-modal
// pin it by name on the default locale.
const PRODUCT_ID = process.env.E2E_PRODUCT_ID; // 'Arepa de queso' in the seed
const SELLER_NAME = 'Arepas El Parche';
// A well-formed ObjectId no product has.
const MISSING_ID = '0'.repeat(24);

const openDialog = page => page.locator('dialog[open]');
// The modal's own back/close button, in its top action row. Scoped because
// the ShareButton sheet mounted inside the same dialog has a "Close" of its
// own.
const closeButton = (dialog, name) =>
  dialog.locator('.modal-action').getByRole('button', { name, exact: true });

const COPY = {
  es: {
    path: '/antojos',
    schedule: 'Horario',
    contact: 'Contactar por WhatsApp',
    contactAria: `Contactar a ${SELLER_NAME} por WhatsApp`,
    whatsappText: `Hola ${SELLER_NAME}, te vi en Mercampus. Estoy interesado en el producto Arepa de queso.`,
    recommend: 'Recomendar a un amigo',
    close: 'Cerrar',
    logoAlt: 'Imagen del publicador del producto',
    error: 'Algo salió mal, por favor intente de nuevo',
    favorite: 'Guardar en favoritos',
  },
  en: {
    path: '/en/antojos',
    schedule: 'Schedule',
    contact: 'Contact via WhatsApp',
    contactAria: `Contact ${SELLER_NAME} via WhatsApp`,
    whatsappText: `Hi ${SELLER_NAME}, I saw you on Mercampus. I'm interested in the product Arepa de queso.`,
    recommend: 'Recommend to a friend',
    close: 'Close',
    logoAlt: "Image of the product's seller",
    error: 'Something went wrong, please try again',
    favorite: 'Save to favorites',
  },
};

test.describe('the product modal follows the page locale', () => {
  for (const locale of ['es', 'en']) {
    const copy = COPY[locale];

    test(`${locale}: opened from the listing`, async ({ page }) => {
      await page.goto(copy.path);
      await page.getByText('Arepa de queso').first().click();
      await expect(page).toHaveURL(new RegExp(`\\?producto=${PRODUCT_ID}$`));
      const dialog = openDialog(page);

      await expect(dialog.getByRole('heading', { name: copy.schedule })).toBeVisible();
      await expect(closeButton(dialog, copy.close)).toBeVisible();
      await expect(dialog.getByAltText(copy.logoAlt)).toBeVisible();
      await expect(dialog.getByRole('button', { name: copy.recommend })).toBeVisible();

      const whatsapp = dialog.getByRole('link', { name: copy.contactAria, exact: true });
      await expect(whatsapp).toBeVisible();
      await expect(whatsapp).toHaveText(copy.contact);
      // The prefilled message the seller receives is copy too.
      const href = await whatsapp.getAttribute('href');
      expect(new URL(href).searchParams.get('text')).toContain(copy.whatsappText);

      await page.screenshot({ path: `test-results/product-modal-i18n-${locale}.png` });
    });

    test(`${locale}: error state for a product that does not exist`, async ({ page }) => {
      await page.goto(`${copy.path}?producto=${MISSING_ID}`);
      const dialog = openDialog(page);

      await expect(dialog.getByText(copy.error)).toBeVisible();
      await expect(closeButton(dialog, copy.close)).toBeVisible();
      // T-93's unwired favourites placeholder: named, still not wired (T-68).
      await expect(dialog.getByRole('button', { name: copy.favorite })).toBeVisible();

      await page.screenshot({ path: `test-results/product-modal-error-i18n-${locale}.png` });
    });
  }
});
