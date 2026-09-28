import { expect, test } from '@playwright/test';

// T-165: a product opened from a seller's product list showed no seller and
// no schedule, and its WhatsApp button read "Contactar a el vendedor" with an
// href of `wa.me/+57?text=...` - no number. Reported by the human on the live
// site, both from the seller page and from the listing's
// product -> seller -> product modals.

const SELLER_ID = process.env.E2E_SELLER_ID;
const SELLER_NAME = 'Arepas El Parche';

// The link the buyer taps to reach the seller: the product's only conversion.
const whatsappIn = scope =>
  scope.getByRole('link', { name: `Contactar a ${SELLER_NAME} por WhatsApp` });

const expectSellerAndNumber = async page => {
  const dialog = page.locator('dialog[open]').last();
  await expect(dialog.getByText(SELLER_NAME).first()).toBeVisible();
  const link = whatsappIn(dialog);
  await expect(link).toBeVisible();
  // A number after +57, not straight into "?text=".
  await expect(link).toHaveAttribute('href', /^https:\/\/wa\.me\/\+57\d{7,}\?text=/);
};

test.describe('a product opened from a seller list keeps its seller (T-165)', () => {
  test('from the seller page', async ({ page }) => {
    await page.goto(`/antojos/sellers/${SELLER_ID}`);

    await page.getByText('Arepa de queso').first().click();

    await expectSellerAndNumber(page);
  });

  test('from the listing: product -> seller -> product', async ({ page }) => {
    await page.goto('/antojos');

    // Product modal from the listing (already had the seller before).
    await page.getByText('Arepa de queso').first().click();
    const first = page.locator('dialog[open]').last();
    await expect(whatsappIn(first)).toBeVisible();

    // Its seller...
    await first.getByRole('button', { name: new RegExp(SELLER_NAME) }).click();
    const sellerDialog = page.locator('dialog[open]').last();
    await expect(sellerDialog.getByText('¡Conoce todos los productos de este vendedor!')).toBeVisible();

    // ...and a product from the seller's own list: this one lost the seller.
    await sellerDialog.getByText('Buñuelo').first().click();

    await expectSellerAndNumber(page);
    await page.screenshot({ path: 'test-results/t165-product-from-seller-list.png' });
  });
});
