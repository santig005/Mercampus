import { expect, test } from '@playwright/test';

// T-97 (audit findings F28 and F29). The seller's product edit screen used to
// render `Error al cargar los detalles del producto.` as a naked paragraph -
// no header band, no form, no link back, and the URL still claiming to be
// editing a product - for three different reasons: an unknown id, a malformed
// id, and a product whose owner is not publicly visible (that one arrived as a
// 500, so the screen's own ownership check never ran).
//
// Runs with the T-84 session, which resolves to the seeded owner of "Arepas El
// Parche": the approved seller.
const BARE_ERROR = 'Error al cargar los detalles del producto.';
const MISSING_ID = '0123456789abcdef01234567';
const MALFORMED_ID = 'zzzzzz';

const editUrl = id => `/antojos/sellers/products/edit/${id}`;
const wayOut = page => page.getByRole('link', { name: 'Ver los antojos' });

test.describe('product edit dead ends (T-97)', () => {
  test('your own product opens the form, prefilled', async ({ page }) => {
    // Through the UI rather than an id from the environment: this is the path
    // a seller actually takes, and it proves the list still links to a screen
    // that works.
    await page.goto('/antojos/sellers/products/edit');
    await page.getByText('Arepa de queso').first().click();

    await expect(page).toHaveURL(/products\/edit\/[a-f\d]{24}/);
    await expect(page.getByLabel('Nombre')).toHaveValue('Arepa de queso');
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeVisible();
    await expect(page.getByText(BARE_ERROR)).toHaveCount(0);
  });

  const badIds = [
    ['a well-formed id that matches nothing', MISSING_ID],
    ['a malformed id', MALFORMED_ID],
  ];

  for (const [label, id] of badIds) {
    test(`${label} lands on the 404, not a bare line of text`, async ({
      page,
    }) => {
      await page.goto(editUrl(id));

      await expect(page.getByText(BARE_ERROR)).toHaveCount(0);
      // No form either: F28's other half was a URL that still claimed to be
      // an editor.
      await expect(
        page.getByRole('button', { name: 'Guardar Cambios' })
      ).toHaveCount(0);
      await expect(wayOut(page)).toBeVisible();
    });
  }

  test("another seller's product does not 500, and says nothing about it", async ({
    page,
  }) => {
    // The finding's measured cause: this product exists, its owner is not
    // approved, and GET /api/products/[id] answered 500 for it - 17 of the 112
    // products in the real database are this shape.
    const pendingId = process.env.E2E_PENDING_PRODUCT_ID;
    expect(pendingId, 'scripts/e2e.mjs must export E2E_PENDING_PRODUCT_ID').toBeTruthy();

    await page.goto(editUrl(pendingId));

    await expect(page.getByText(BARE_ERROR)).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Guardar Cambios' })
    ).toHaveCount(0);
    // Indistinguishable from the id that matches nothing: the page must not
    // confirm that somebody else's product exists.
    await expect(wayOut(page)).toBeVisible();
    await expect(page.getByText('Brownie de chocolate')).toHaveCount(0);

    await page.screenshot({ path: 'test-results/97-edit-not-yours.png' });
  });

  test('the API hands the client no driver message for a malformed id', async ({
    request,
  }) => {
    // F29: this answered 500 with `Cast to ObjectId failed for value
    // "not-an-id" (type string) at path "_id" for model "Product"`.
    const response = await request.get(`/api/products/${MALFORMED_ID}`);

    expect(response.status()).toBe(400);
    const body = JSON.stringify(await response.json());
    expect(body).not.toContain('Cast to ObjectId');
    expect(body).not.toContain('Product');
  });
});
