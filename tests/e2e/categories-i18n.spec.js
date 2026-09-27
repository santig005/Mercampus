import { expect, test } from '@playwright/test';

// Category values stay the stored Spanish strings - the URL keeps
// ?category=Galletas in both locales - and only the chip's visible text
// follows the page locale (src/lib/category-labels.ts). These click a chip
// the way a buyer does and check both halves: the label that renders, and
// the value that reaches the URL.
const SELLER_ID = process.env.E2E_SELLER_ID; // 'Arepas El Parche'
const chips = page => page.locator('.hide-scrollbar button');

const COPY = {
  es: {
    prefix: '',
    antojos: ['Todos', 'Panadería', 'Galletas', 'Repostería', 'Comida rápida', 'Otros'],
    cookies: 'Galletas',
    fastFood: 'Comida rápida',
    marketplace: ['Todos', 'Accesorios', 'Maquillaje', 'Ropa', 'Otros'],
    sellerHeading: /🍕 Antojos \(\d+ productos?\)/,
  },
  en: {
    prefix: '/en',
    antojos: ['All', 'Bakery', 'Cookies', 'Pastries', 'Fast food', 'Other'],
    cookies: 'Cookies',
    fastFood: 'Fast food',
    marketplace: ['All', 'Accessories', 'Makeup', 'Clothing', 'Other'],
    sellerHeading: /🍕 Cravings \(\d+ products?\)/,
  },
};

test.describe('category labels follow the locale, values do not', () => {
  for (const locale of ['es', 'en']) {
    const copy = COPY[locale];

    test(`${locale}: antojos chips, and a click filters by the Spanish value`, async ({ page }) => {
      await page.goto(`${copy.prefix}/antojos`);
      for (const name of copy.antojos) {
        await expect(chips(page).filter({ hasText: new RegExp(`^${name}$`) })).toHaveCount(1);
      }
      // A product card's category tag ('Arepa de queso' is 'Comida rápida'),
      // not the chip of the same name - ProductCard renders it as a span.
      await expect(
        page.locator('span.my-card-subtitle').filter({ hasText: new RegExp(`^${copy.fastFood}$`) }).first()
      ).toBeVisible();
      await page.screenshot({ path: `test-results/categories-antojos-${locale}.png` });

      await chips(page).filter({ hasText: new RegExp(`^${copy.cookies}$`) }).click();
      await expect(page).toHaveURL(/[?&]category=Galletas(&|$)/);
      await expect(
        chips(page).filter({ hasText: new RegExp(`^${copy.cookies}$`) })
      ).toHaveClass(/category-active/);
    });

    test(`${locale}: marketplace chips`, async ({ page }) => {
      await page.goto(`${copy.prefix}/marketplace`);
      for (const name of copy.marketplace) {
        await expect(chips(page).filter({ hasText: new RegExp(`^${name}$`) })).toHaveCount(1);
      }
      await page.screenshot({ path: `test-results/categories-marketplace-${locale}.png` });
    });

    test(`${locale}: a seller's products are grouped under a translated heading`, async ({
      page,
    }) => {
      await page.goto(`${copy.prefix}/antojos/sellers/${SELLER_ID}`);
      await expect(page.getByRole('heading', { name: copy.sellerHeading })).toBeVisible();
    });
  }

  test('a ?category= link keeps working in English (shared links carry the Spanish value)', async ({
    page,
  }) => {
    await page.goto('/en/antojos?category=Galletas');
    await expect(
      chips(page).filter({ hasText: /^Cookies$/ })
    ).toHaveClass(/category-active/);
  });
});
