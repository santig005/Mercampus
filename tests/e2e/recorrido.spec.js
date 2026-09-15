import { expect, test } from '@playwright/test';

// One screenshot per screen, numbered so they read in order when the CI
// artifact is opened.
const shot = (page, name) =>
  page.screenshot({ path: `test-results/${name}.png`, fullPage: true });

// Seed ids. Only the approved seller and its products show up publicly.
const PRODUCT_ID = process.env.E2E_PRODUCT_ID;
const SELLER_ID = process.env.E2E_SELLER_ID;

test.describe('public walkthrough', () => {
  test('home redirects to the antojos listing', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(/\/antojos$/);
    await expect(page.getByText('calma tus antojos')).toBeVisible();

    await shot(page, '01-home');
  });

  test('the listing shows only publishable products', async ({ page }) => {
    await page.goto('/antojos');

    // If the grid fails, the app paints an error in its place and these names
    // do not appear. They are the approved seller's three antojos.
    await expect(page.getByText('Arepa de queso').first()).toBeVisible();
    await expect(page.getByText('Buñuelo').first()).toBeVisible();
    await expect(page.getByText('Jugo de mango').first()).toBeVisible();

    // Nothing from the seller awaiting approval should show up.
    await expect(page.getByText('Brownie de chocolate')).toHaveCount(0);
    await expect(page.getByText('Galletas de avena')).toHaveCount(0);

    // And the marketplace product does not belong to this section.
    await expect(page.getByText('Termo Mercampus')).toHaveCount(0);

    // No modal should be left open on load.
    await expect(page.locator('dialog[open]')).toHaveCount(0);

    await shot(page, '02-listado-antojos');
  });

  test('the product detail page loads the seeded product', async ({ page }) => {
    await page.goto(`/antojos/${PRODUCT_ID}`);

    await expect(page.getByText('Arepa de queso').first()).toBeVisible();
    // Price in Colombian pesos: thousands separated by a dot, not a comma.
    await expect(page.getByText(/\$\s*6\.000/).first()).toBeVisible();
    await expect(page.getByText('6,000')).toHaveCount(0);

    // T-69: a shared link has to carry its own preview, not the root layout's
    // generic one (the same title and image for every page).
    await expect(page).toHaveTitle('Arepa de queso · Mercampus');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Arepa de queso · Mercampus'
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);

    await shot(page, '03-detalle-producto');
  });

  test("the seller's profile loads their business", async ({ page }) => {
    // T-110: SellerPage.jsx is a client component that fetches its own copy of
    // the seller (its own `/api/sellers/:id` call, separate from the server
    // read generateMetadata already did) in a useEffect after mount - nothing
    // but a full-screen spinner renders until that resolves. The assertions
    // below already retry via toBeVisible(), which covers this most of the
    // time, but T-80 saw this spec fail once and pass 16/16 on an immediate
    // re-run: a real, if rare, data-load race. Waiting on the response itself
    // is the real condition, not an incidental proxy for it.
    const sellerResponse = page.waitForResponse(
      response => new URL(response.url()).pathname === `/api/sellers/${SELLER_ID}`
    );
    await page.goto(`/antojos/sellers/${SELLER_ID}`);
    await sellerResponse;

    await expect(page.getByText('Arepas El Parche').first()).toBeVisible();
    // Its own products, not the other seller's.
    await expect(page.getByText('Arepa de queso').first()).toBeVisible();
    await expect(page.getByText('Brownie de chocolate')).toHaveCount(0);

    // T-69: same case as the product detail, for the seller profile.
    await expect(page).toHaveTitle('Arepas El Parche · Mercampus');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Arepas El Parche · Mercampus'
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);

    await shot(page, '04-perfil-vendedor');
  });

  test('the seller listing shows the business cards', async ({ page }) => {
    // The only public screen that renders SellerCard (via SellerGrid). The
    // product detail and the seller profile do not use it.
    //
    // T-110: same data-load race as the seller profile test above - SellerGrid
    // is a client component that fetches GET /api/sellers in a useEffect after
    // mount, and renders an empty-state until that resolves. Wait on the
    // response itself rather than only on toBeVisible()'s implicit retry.
    const sellersResponse = page.waitForResponse(
      response => new URL(response.url()).pathname === '/api/sellers'
    );
    await page.goto('/antojos/sellers/list');
    await sellersResponse;

    await expect(page.getByText('Arepas El Parche').first()).toBeVisible();
    await expect(page.getByText('De la plancha a tu clase').first()).toBeVisible();

    // T-106: the pending seller does not show here, and now that is the
    // server's doing - GET /api/sellers filters `approved: true` in the Mongo
    // query. This assertion used to pass for a much weaker reason: the API
    // returned every seller and SellerGrid.jsx dropped the pending ones in the
    // browser, so anyone calling the endpoint directly instead of loading this
    // page saw the whole queue. The assertion is unchanged; what it proves is
    // not.
    await expect(page.getByText('Postres Laura')).toHaveCount(0);

    await shot(page, '05-listado-vendedores');
  });
});
