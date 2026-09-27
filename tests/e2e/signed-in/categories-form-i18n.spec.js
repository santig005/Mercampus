import { expect, test } from '@playwright/test';

// The seller's category picker: options read in the page locale, and a
// product saved under the Spanish value 'Comida rápida' still shows as
// selected in English - proof the form matches on the stored value, not on
// the label. Runs with the T-84 session (the seeded owner of the product).
const PRODUCT_ID = process.env.E2E_PRODUCT_ID; // 'Arepa de queso', ['Comida rápida']

const COPY = {
  es: { prefix: '', options: ['Dulces', 'Galletas', 'Comida rápida', 'Otros'], fastFood: 'Comida rápida' },
  en: { prefix: '/en', options: ['Sweets', 'Cookies', 'Fast food', 'Other'], fastFood: 'Fast food' },
};

test.describe("the seller's category picker follows the locale", () => {
  for (const locale of ['es', 'en']) {
    const copy = COPY[locale];

    test(`${locale}: add-product options`, async ({ page }) => {
      await page.goto(`${copy.prefix}/antojos/product/add`);
      // The form has two react-selects (section and category); this is the one
      // carrying the hidden `category` input.
      await page
        .locator('.basic-multi-select')
        .filter({ has: page.locator('input[name="category"]') })
        .locator('.Selecciona__control')
        .click();
      for (const name of copy.options) {
        await expect(
          page.locator('.Selecciona__option').filter({ hasText: new RegExp(`^${name}$`) })
        ).toHaveCount(1);
      }
      await page.screenshot({ path: `test-results/categories-add-form-${locale}.png` });
    });

    test(`${locale}: edit form shows the stored category, labelled`, async ({ page }) => {
      await page.goto(`${copy.prefix}/antojos/sellers/products/edit/${PRODUCT_ID}`);
      await expect(
        page.locator('.select__multi-value__label').filter({ hasText: new RegExp(`^${copy.fastFood}$`) })
      ).toBeVisible();
    });
  }
});
