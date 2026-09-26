import { expect, test } from '@playwright/test';

// T-167 (option C): the listing's product modal lives in the URL
// (?producto=<id>). Opening pushes a history entry, so the browser's back
// button closes it - and nothing behind it reloads: the listing, its loaded
// pages and its scroll stay put.

const PRODUCT_ID = process.env.E2E_PRODUCT_ID; // 'Arepa de queso' in the seed

const openDialog = page => page.locator('dialog[open]');
const whatsapp = page =>
  openDialog(page).getByRole('link', { name: /^Contactar a .+ por WhatsApp$/ });

// Listing requests only - not /api/products/<id>.
const countListingRequests = page => {
  const seen = { count: 0 };
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/products') seen.count += 1;
  });
  return seen;
};

// The page scrolls inside the layout's drawer, not the window. The nearest
// scrollable ancestor of a product card is what the buyer actually scrolled.
const scrollerTop = page =>
  page.evaluate(() => {
    let el = [...document.querySelectorAll('*')].find(n => n.textContent === 'Arepa de queso');
    while (el && !(el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY))) {
      el = el.parentElement;
    }
    return (el ?? document.scrollingElement).scrollTop;
  });
const scrollListingTo = (page, top) =>
  page.evaluate(y => {
    let el = [...document.querySelectorAll('*')].find(n => n.textContent === 'Arepa de queso');
    while (el && !(el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY))) {
      el = el.parentElement;
    }
    (el ?? document.scrollingElement).scrollTop = y;
  }, top);

test.describe('product modal stack (T-167)', () => {
  test('opening puts ?producto= in the URL and back closes it, without reloading the listing', async ({
    page,
  }) => {
    // A short window, so the first page of the listing actually scrolls (at
    // 900px it is only ~30px taller than the viewport).
    await page.setViewportSize({ width: 1280, height: 500 });
    await page.goto('/antojos');
    await expect(page.getByText('Arepa de queso').first()).toBeVisible();

    // Only one product dialog in the page - the stack's - not one per list.
    await expect(page.locator('dialog[id^="product_modal"]')).toHaveCount(1);

    await scrollListingTo(page, 250);
    await expect.poll(() => scrollerTop(page)).toBeGreaterThan(100);
    const scrolled = await scrollerTop(page);
    const listing = countListingRequests(page);

    await page.getByText('Arepa de queso').first().click();
    await expect(page).toHaveURL(new RegExp(`[?&]producto=${PRODUCT_ID}$`));
    await expect(whatsapp(page)).toBeVisible();

    await page.goBack();
    await expect(openDialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/antojos$/);
    await expect(page.getByText('Arepa de queso').first()).toBeVisible();
    await expect.poll(() => scrollerTop(page)).toBe(scrolled);
    expect(listing.count).toBe(0);
  });

  test('the close button and Escape both close it and clear the URL', async ({ page }) => {
    await page.goto('/antojos');

    await page.getByText('Arepa de queso').first().click();
    await expect(whatsapp(page)).toBeVisible();
    await openDialog(page).locator('button[aria-label="Cerrar"]').first().click();
    await expect(openDialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/antojos$/);

    await page.getByText('Arepa de queso').first().click();
    await expect(whatsapp(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(openDialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/antojos$/);
  });

  test('a cold load of ?producto= opens it, and closing stays on the listing', async ({
    page,
  }) => {
    await page.goto(`/antojos?producto=${PRODUCT_ID}`);

    await expect(whatsapp(page)).toBeVisible();
    await expect(openDialog(page).getByText('Arepa de queso').first()).toBeVisible();

    // No entry of ours behind it: closing must not go back out of the site.
    await openDialog(page).locator('button[aria-label="Cerrar"]').first().click();
    await expect(openDialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/antojos$/);
  });

  test('the listing filters survive opening and closing', async ({ page }) => {
    await page.goto('/antojos?sort=newest');

    await page.getByText('Arepa de queso').first().click();
    await expect(page).toHaveURL(new RegExp(`\\?sort=newest&producto=${PRODUCT_ID}$`));

    await page.goBack();
    await expect(page).toHaveURL(/\/antojos\?sort=newest$/);
  });

  test('works under /en', async ({ page }) => {
    await page.goto('/en/antojos');

    await page.getByText('Arepa de queso').first().click();
    await expect(page).toHaveURL(new RegExp(`/en/antojos\\?producto=${PRODUCT_ID}$`));
    await expect(whatsapp(page)).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/en\/antojos$/);
  });
});

// T-167b: the seller modal joins the stack. Product -> its seller -> one of
// that seller's products is three history entries now, not three nested
// dialogs, and the back button walks them in reverse.
const SELLER_ID = process.env.E2E_SELLER_ID; // 'Arepas El Parche'
const OBJECT_ID = '[0-9a-f]{24}';
// The open modal is the last query parameter. [?&] needs no escaping.
const modalInUrl = (param, id) => new RegExp('[?&]' + param + '=' + id + '$');

test.describe('seller modal in the stack (T-167b)', () => {
  test('product -> seller -> product, then back walks it in reverse', async ({ page }) => {
    await page.goto('/antojos');
    await expect(page.locator('dialog[id^="seller_modal"]')).toHaveCount(1);

    await page.getByText('Arepa de queso').first().click();
    await expect(page).toHaveURL(modalInUrl('producto', PRODUCT_ID));

    await openDialog(page).getByRole('button', { name: /Arepas El Parche/ }).click();
    await expect(page).toHaveURL(modalInUrl('vendedor', SELLER_ID));
    await expect(openDialog(page)).toHaveCount(1);
    await expect(
      openDialog(page).getByText('¡Conoce todos los productos de este vendedor!')
    ).toBeVisible();

    await openDialog(page).getByText('Buñuelo').first().click();
    await expect(page).toHaveURL(modalInUrl('producto', OBJECT_ID));
    await expect(page).not.toHaveURL(modalInUrl('producto', PRODUCT_ID));
    await expect(openDialog(page)).toHaveCount(1);
    // The T-165 bug, through the new path: the seller is still there.
    await expect(whatsapp(page)).toHaveAttribute('href', /^https:\/\/wa\.me\/\+57\d{7,}\?text=/);

    await page.goBack();
    await expect(page).toHaveURL(modalInUrl('vendedor', SELLER_ID));
    await expect(
      openDialog(page).getByText('¡Conoce todos los productos de este vendedor!')
    ).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(modalInUrl('producto', PRODUCT_ID));
    await expect(whatsapp(page)).toBeVisible();

    await page.goBack();
    await expect(openDialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/antojos$/);
  });

  test('a cold load of ?vendedor= opens the seller, and closing stays on the listing', async ({
    page,
  }) => {
    await page.goto(`/antojos?vendedor=${SELLER_ID}`);

    await expect(openDialog(page).getByText('Arepas El Parche').first()).toBeVisible();
    await expect(
      openDialog(page).getByText('¡Conoce todos los productos de este vendedor!')
    ).toBeVisible();

    await openDialog(page).locator('button[aria-label="Cerrar"]').first().click();
    await expect(openDialog(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/antojos$/);
  });
});
