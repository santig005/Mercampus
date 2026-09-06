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
