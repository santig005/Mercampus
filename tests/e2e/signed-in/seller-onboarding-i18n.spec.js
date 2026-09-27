import { expect, test } from '@playwright/test';
import mongoose from 'mongoose';

// T-81 (seller onboarding zone): /antojos/sellers/register and
// /antojos/sellers/approving under [locale].
//
// The T-84 session is the seeded owner of "Arepas El Parche", an APPROVED
// seller - and both screens exist for everybody else: register for a user with
// no seller profile, approving for a seller still waiting. Asserting only on
// the redirects an approved seller gets would never render either page. So
// these tests put the fixture into the state each screen is for, straight in
// the e2e database (scripts/e2e.mjs hands MONGO_URI to Playwright), and
// afterEach puts it back even when a test fails: the suite runs on one worker,
// and later specs assert on this seller being approved and linked.
//
// The server reads the seller fresh on every request (getSellerContextData in
// the root layout), so a page.goto after a write sees the new state.

const SELLER_ID = process.env.E2E_SELLER_ID;
const BUSINESS = 'Arepas El Parche';

let sellers;
let users;
let ownerId;

const setApproved = approved =>
  sellers.updateOne({ _id: new mongoose.Types.ObjectId(SELLER_ID) }, { $set: { approved } });
const unlinkSeller = () => users.updateOne({ _id: ownerId }, { $unset: { sellerId: '' } });
const restore = async () => {
  await setApproved(true);
  await users.updateOne(
    { _id: ownerId },
    { $set: { sellerId: new mongoose.Types.ObjectId(SELLER_ID) } }
  );
};

test.describe('i18n on the seller onboarding zone (T-81)', () => {
  test.beforeAll(async () => {
    expect(SELLER_ID, 'E2E_SELLER_ID is set by scripts/e2e.mjs').toBeTruthy();
    await mongoose.connect(process.env.MONGO_URI);
    sellers = mongoose.connection.collection('sellers');
    users = mongoose.connection.collection('users');
    const owner = await users.findOne({
      sellerId: new mongoose.Types.ObjectId(SELLER_ID),
    });
    expect(owner, 'the seeded owner of the approved seller').toBeTruthy();
    ownerId = owner._id;
  });

  test.afterEach(restore);

  test.afterAll(async () => {
    await mongoose.disconnect();
  });

  // The control: with the fixture as it is, neither page is for this user.
  // Used to assert the redirect landed on the *bare* schedules page -
  // /schedules had no [locale] file yet, and localizedHref left it
  // unprefixed on purpose (prefixing would have 404'd it). T-81's profile/
  // schedule zone migrated it, so useCheckSeller's redirect (which already
  // went through localizedHref, same as every other redirect it makes) now
  // correctly keeps English instead of dropping it.
  test('an approved seller is sent from /en/.../approving to /en/.../schedules', async ({
    page,
  }) => {
    await page.goto('/en/antojos/sellers/approving');

    await expect(page).toHaveURL(/\/en\/antojos\/sellers\/schedules$/);
  });

  test('approving, in Spanish (default, no prefix)', async ({ page }) => {
    await setApproved(false);

    await page.goto('/antojos/sellers/approving');

    await expect(
      page.getByRole('heading', {
        name: 'Tu estado de vendedor está en proceso de aprobación',
      })
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByText(`Hola ${BUSINESS}`)).toBeVisible();
    await page.screenshot({ path: 'test-results/t81-onboarding-approving-es.png' });
  });

  test('approving, in English via /en - the WhatsApp message too', async ({ page }) => {
    await setApproved(false);

    await page.goto('/en/antojos/sellers/approving');

    await expect(
      page.getByRole('heading', { name: 'Your seller account is pending approval' })
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText(`Hi ${BUSINESS}`)).toBeVisible();
    // Not a form, but a protected path, and the switcher hides on all of them
    // (isProtectedPath, decided on PR #373) - pinned so that stays deliberate.
    await expect(page.getByRole('link', { name: 'English' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Español' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/t81-onboarding-approving-en.png' });

    const link = page.getByRole('link', { name: 'Contact us / Request approval on WhatsApp' });
    const text = new URL(await link.getAttribute('href')).searchParams.get('text');
    expect(text).toBe(
      `Hi, I am the seller ${BUSINESS}, I signed up on Mercampus. Could you review my application to approve me?`
    );
  });

  // The redirect useCheckSeller makes is the one this PR localizes: a pending
  // seller opening register is bounced to approving, and from /en it has to
  // land on /en - approving has a twin now.
  test('a pending seller on /en/.../register is bounced to /en/.../approving', async ({
    page,
  }) => {
    await setApproved(false);

    await page.goto('/en/antojos/sellers/register');

    await expect(page).toHaveURL(/\/en\/antojos\/sellers\/approving$/);
    await expect(
      page.getByRole('heading', { name: 'Your seller account is pending approval' })
    ).toBeVisible();
  });

  test('register, in Spanish (default, no prefix)', async ({ page }) => {
    await unlinkSeller();

    await page.goto('/antojos/sellers/register');

    await expect(page.getByRole('heading', { name: 'Registra tu Negocio' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByText('Nombre del Negocio')).toBeVisible();
    await expect(page.getByText('+ Agregar')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Registrar Negocio' })).toBeVisible();
    // No locale switcher on a form screen (decided on PR #373): it is a full
    // page navigation, and would wipe what the seller had typed.
    await expect(page.getByRole('link', { name: 'English' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Español' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/t81-onboarding-register-es.png', fullPage: true });
  });

  test('register, in English via /en - shared ImageGrid and university picker too', async ({
    page,
  }) => {
    await unlinkSeller();

    await page.goto('/en/antojos/sellers/register');

    await expect(
      page.getByRole('heading', { name: 'Register your business' })
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByText('Business name', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Describe your business')).toBeVisible();
    await expect(page.getByText('+ Add')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register business' })).toBeVisible();

    // Scoped to the form: the header's university picker (UniversitySelector)
    // renders the same component, so the page has two of these buttons.
    await page.locator('form').getByRole('button', { name: 'Information' }).click();
    await expect(
      page.getByText('Mercampus is not affiliated with any of these universities', {
        exact: false,
      })
    ).toBeVisible();
    // No locale switcher on a form screen (decided on PR #373): it is a full
    // page navigation, and would wipe what the seller had typed.
    await expect(page.getByRole('link', { name: 'English' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Español' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/t81-onboarding-register-en.png', fullPage: true });
  });
});
