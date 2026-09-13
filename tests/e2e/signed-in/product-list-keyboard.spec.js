import { expect, test } from '@playwright/test';

// T-98 (audit findings F32 and F33). On /antojos/sellers/products/edit, every
// tab stop after "Añadir Producto" used to be either an unnamed checkbox
// (ToggleSwitch renders a bare <input type=checkbox> inside a <label> with no
// text of its own - F32) or an unreachable <div onClick> around the product
// card (no role, no tabIndex - F33). A screen reader user got a wall of
// identical, silent checkboxes, and nobody could open a product to change its
// price without a mouse.
//
// Runs with the T-84 session, which resolves to the seeded owner of "Arepas El
// Parche": the approved seller. "Arepa de queso" is one of its antojos, but
// Mongo's natural order (no sort on this route) is not something to pin a
// test to, so the keyboard test below reads whichever product it lands on
// off the card instead of assuming it's that one.
test.describe('product list keyboard access (T-98)', () => {
  test('the availability switches now have an accessible name (F32)', async ({
    page,
  }) => {
    await page.goto('/antojos/sellers/products/edit');

    // The seller's own switch, and one product's - naming both the row and
    // its current state, not just "checkbox" twenty times over.
    await expect(
      page.getByRole('checkbox', { name: /Disponibilidad de Arepas El Parche/ })
    ).toBeVisible();
    await expect(
      page.getByRole('checkbox', { name: /Disponibilidad de Arepa de queso/ })
    ).toBeVisible();
  });

  test('a product opens for editing by keyboard alone (F33)', async ({
    page,
  }) => {
    await page.goto('/antojos/sellers/products/edit');

    await page.getByRole('button', { name: 'Añadir Producto' }).focus();

    // Tab from "Añadir Producto" until focus lands on a product card's link.
    // Before this fix the card was a <div onClick> with no tabIndex, so focus
    // would skip straight from the button into the checkboxes and this loop
    // would run out without ever finding an href - the regression this test
    // guards against.
    let target = null;
    for (let i = 0; i < 30 && !target; i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      const href = await focused.getAttribute('href');
      if (href?.includes('/antojos/sellers/products/edit/')) {
        target = focused;
      }
    }

    expect(
      target,
      'tabbing from "Añadir Producto" never reached a product card link'
    ).toBeTruthy();

    // Whichever product this landed on (section order is by name, not by the
    // card that was reached) - read its name off the card so the assertion
    // after navigating isn't pinned to one product.
    const productName = (await target.locator('h2').innerText()).trim();

    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/products\/edit\/[a-f\d]{24}/);
    await expect(page.getByLabel('Nombre')).toHaveValue(productName);
    await expect(
      page.getByRole('button', { name: 'Guardar Cambios' })
    ).toBeVisible();
  });
});
