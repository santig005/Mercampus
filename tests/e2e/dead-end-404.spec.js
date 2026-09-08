import { expect, test } from '@playwright/test';

// T-90 (audit findings F1 and F2). An id that does not exist used to paint the
// whole product chrome around nothing - "$ NaN" in the price bar and a live
// "Contactar por WhatsApp" button for a product that does not exist - while the
// seller profile spun forever with no error and no way out.
//
// Two shapes of bad id, and they fail in different places: a well-formed
// ObjectId that matches no document reaches Mongo, while a malformed one is
// rejected by the id check before that.
const MISSING_ID = '0123456789abcdef01234567';
const MALFORMED_ID = 'zzzzzz';

const badIds = [
  ['a well-formed id that matches nothing', MISSING_ID],
  ['a malformed id', MALFORMED_ID],
];

const wayOut = page => page.getByRole('link', { name: 'Ver los antojos' });

test.describe('dead ends 404 (T-90)', () => {
  for (const [label, id] of badIds) {
    test(`product: ${label}`, async ({ page }) => {
      await page.goto(`/antojos/${id}`);

      // The finding is the fake product, not the status line: a price bar
      // reading "$ NaN" and a WhatsApp button that would open a real chat.
      await expect(page.getByText('$ NaN')).toHaveCount(0);
      await expect(page.getByText(/whatsapp/i)).toHaveCount(0);
      await expect(wayOut(page)).toBeVisible();

      await page.screenshot({ path: 'test-results/14-not-found.png' });
    });

    test(`seller: ${label}`, async ({ page }) => {
      await page.goto(`/antojos/sellers/${id}`);

      // F2 was a spinner that never resolved.
      await expect(page.locator('.loading')).toHaveCount(0);
      await expect(wayOut(page)).toBeVisible();
    });

    test(`marketplace product: ${label}`, async ({ page }) => {
      await page.goto(`/marketplace/${id}`);

      await expect(wayOut(page)).toBeVisible();
    });
  }

  // The page renders as a 404 but answers 200 - a soft 404. It is not this
  // route's doing: a route that calls notFound() with no data access at all
  // answers 200 too, while a path that matches no route answers a real 404.
  // The root layout awaits Clerk and Mongo before rendering children, so the
  // response is committed before notFound() is ever reached. Filed as T-91.
  //
  // test.fail() rather than a comment: when T-91 lands this test starts
  // passing, and Playwright fails the run to say so.
  test('the status is still 200 (T-91)', async ({ page }) => {
    // Inside the body, so it marks this test and not the whole describe.
    test.fail();

    const response = await page.goto(`/antojos/${MISSING_ID}`);

    expect(response.status()).toBe(404);
  });

  test('a product that does exist still renders', async ({ page }) => {
    const response = await page.goto(`/antojos/${process.env.E2E_PRODUCT_ID}`);

    expect(response.status()).toBe(200);
    await expect(wayOut(page)).toHaveCount(0);
  });

  test('a seller that does exist still renders', async ({ page }) => {
    const response = await page.goto(
      `/antojos/sellers/${process.env.E2E_SELLER_ID}`
    );

    expect(response.status()).toBe(200);
    await expect(wayOut(page)).toHaveCount(0);
  });
});
