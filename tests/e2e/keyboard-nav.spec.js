import { expect, test } from '@playwright/test';

// T-61. Lighthouse audits the DOM statically (aria, contrast, labels) but
// doesn't simulate a real user tabbing through a page. These tests do, on
// the site's two public forms.

test.describe('keyboard navigation', () => {
  test('pqrs: tab visits checkbox, email, type, description, support and submit in order', async ({
    page,
  }) => {
    await page.goto('/antojos/pqrs');

    const anonymous = page.locator('form').getByRole('checkbox');
    const email = page.getByPlaceholder('Ingresa tu correo electrónico');
    const type = page.getByRole('combobox');
    const description = page.getByPlaceholder('Escribe los detalles de tu solicitud');
    const support = page.getByRole('link', { name: /hablar con soporte/i });
    const submit = page.getByRole('button', { name: 'Enviar' });

    await anonymous.focus();
    await expect(anonymous).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(email).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(type).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(description).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(support).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(submit).toBeFocused();
  });

  test('pqrs: spacebar checks "Anónimo" and hides the email field', async ({ page }) => {
    await page.goto('/antojos/pqrs');

    const anonymous = page.locator('form').getByRole('checkbox');
    const email = page.getByPlaceholder('Ingresa tu correo electrónico');

    await expect(email).toBeVisible();

    await anonymous.focus();
    await page.keyboard.press('Space');

    await expect(email).toBeHidden();
  });

  test('login: tab reaches email, password, and submit only enables with both', async ({
    page,
  }) => {
    await page.goto('/auth/login');

    const email = page.getByPlaceholder('johndoe@gmail.com');
    const password = page.getByPlaceholder('********');
    const submit = page.getByRole('button', { name: 'Iniciar Sesión' });

    // Disabled while the fields are empty: it shouldn't enter tab order
    // until there's something to submit.
    await expect(submit).toBeDisabled();

    await email.focus();
    await page.keyboard.type('ana@example.test');

    await page.keyboard.press('Tab');
    await expect(password).toBeFocused();
    await page.keyboard.type('unaClaveSegura123');

    await page.keyboard.press('Tab');
    await expect(submit).toBeFocused();
    await expect(submit).toBeEnabled();
  });
});

// T-86 (audit finding F5). Tab order was already covered above, but a focused
// control computed to `outline: solid 2px rgba(0, 0, 0, 0)` - the ring existed
// and was fully transparent, so keyboard users could not see where they were.
// These read the ring off the focused element instead of trusting the CSS.
const outlineOf = locator =>
  locator.evaluate(element => {
    const style = getComputedStyle(element);
    return {
      style: style.outlineStyle,
      width: style.outlineWidth,
      color: style.outlineColor,
    };
  });

// Evidence for the PR: the ring is the point, so it has to be seen and not
// only measured. Element-only shots clip it - the outline is drawn 2px OUTSIDE
// the element's box - so these clip a padded region around it instead.
const shotAround = async (page, locator, path) => {
  const box = await locator.boundingBox();
  const pad = 14;
  await page.screenshot({
    path,
    clip: {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    },
  });
};

// An `rgba(..., 0)` outline is the exact regression this guards against, and a
// hairline one is not an indicator either.
const expectVisibleRing = outline => {
  expect(outline.style).not.toBe('none');
  expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2);
  expect(outline.color).not.toMatch(/rgba\([^)]*,\s*0\s*\)/);
};

test.describe('focus ring (T-86)', () => {
  test('pqrs: the primary submit button shows a ring once tabbed to', async ({ page }) => {
    await page.goto('/antojos/pqrs');

    const submit = page.getByRole('button', { name: 'Enviar' });

    // Tab from the field just before it, so focus arrives by keyboard and the
    // browser applies :focus-visible the way it would for a real visitor.
    await page.getByRole('link', { name: /hablar con soporte/i }).focus();
    await page.keyboard.press('Tab');
    await expect(submit).toBeFocused();

    expectVisibleRing(await outlineOf(submit));

    await shotAround(page, submit, 'test-results/09-focus-ring-boton.png');
  });

  test('login: the email field shows a ring once tabbed to', async ({ page }) => {
    await page.goto('/auth/login');

    const email = page.getByPlaceholder('johndoe@gmail.com');
    const password = page.getByPlaceholder('********');

    await email.focus();
    await page.keyboard.press('Tab');
    await expect(password).toBeFocused();

    expectVisibleRing(await outlineOf(password));

    await shotAround(page, password, 'test-results/10-focus-ring-campo.png');
  });

  test('the ring follows the theme into dark mode', async ({ page }) => {
    // T-73's switcher writes localStorage.theme; setting it before the first
    // paint is how the audit forced dark, and it is what the anti-FOUC script
    // in layout.jsx reads.
    await page.addInitScript(() => window.localStorage.setItem('theme', 'dark'));
    await page.goto('/auth/login');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const email = page.getByPlaceholder('johndoe@gmail.com');
    const password = page.getByPlaceholder('********');

    await email.focus();
    await page.keyboard.press('Tab');
    await expect(password).toBeFocused();

    const outline = await outlineOf(password);
    expectVisibleRing(outline);

    await shotAround(page, password, 'test-results/11-focus-ring-dark.png');
  });
});
