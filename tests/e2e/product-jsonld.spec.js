import { expect, test } from '@playwright/test';

// T-151: Product + Offer JSON-LD on /antojos/<id> and /marketplace/<id>.
//
// Found while writing this spec: src/app/layout.jsx wraps every page body in
// <ClerkLoaded>, which renders nothing server-side (ROADMAP.md T-163,
// already open, `opus`/human-required - a cross-cutting fix outside this
// task's scope, not attempted here). So the markup below is real and
// correct, and shows up in the hydrated DOM once Clerk's script loads in a
// browser (the first test here, which passes), but a crawler or validator
// that does not run JavaScript - schema.org's validator, Google's Rich
// Results Test - sees none of it yet, the same bug T-163's own entry
// documents for Organization before it moved into <head>. The second test
// proves that with `test.fixme()`: remove that one line once T-163 ships
// and this test starts passing with no other change.
const JSON_LD_ELEMENT = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

const PRODUCT_ID = process.env.E2E_PRODUCT_ID; // 'Arepa de queso', antojos, 6000 COP
const MARKETPLACE_PRODUCT_ID = process.env.E2E_MARKETPLACE_PRODUCT_ID; // 'Termo Mercampus', marketplace, 45000 COP

const CASES = [
  {
    path: `/antojos/${PRODUCT_ID}`,
    idEnvVarName: 'E2E_PRODUCT_ID',
    section: 'antojos',
    price: 6000,
  },
  {
    path: `/marketplace/${MARKETPLACE_PRODUCT_ID}`,
    idEnvVarName: 'E2E_MARKETPLACE_PRODUCT_ID',
    section: 'marketplace',
    price: 45000,
  },
];

function assertProductEntry(data, path, price) {
  expect(data.name).toBeTruthy();
  expect(data.url.endsWith(path)).toBe(true);
  expect(data.offers['@type']).toBe('Offer');
  expect(data.offers.url).toBe(data.url);
  expect(data.offers.price).toBe(price);
  expect(data.offers.priceCurrency).toBe('COP');
  // T-145 (sold-out state) is not built yet, and the page's own
  // availability badge answers a different question (is the store open
  // right now) - see src/lib/structured-data.ts. Omitted on purpose.
  expect(data.offers).not.toHaveProperty('availability');
}

test.describe('Product JSON-LD on the detail pages (T-151)', () => {
  for (const { path, idEnvVarName, section, price } of CASES) {
    test(`${section}: renders in the DOM once the page hydrates`, async ({ page }) => {
      expect(path, `${idEnvVarName} is set by scripts/e2e.mjs`).not.toContain('undefined');

      await page.goto(path);
      const scripts = page.locator('script[type="application/ld+json"]');
      // The root layout's Organization script (every page) plus this page's
      // Product script, once <ClerkLoaded> lets the tree through.
      await expect(scripts).toHaveCount(2);

      const entries = (await scripts.allTextContents()).map(text => JSON.parse(text));
      const productEntries = entries.filter(entry => entry['@type'] === 'Product');
      expect(productEntries).toHaveLength(1);
      assertProductEntry(productEntries[0], path, price);
      expect(entries.filter(entry => entry['@type'] === 'Organization')).toHaveLength(1);
    });

    test(`${section}: would be visible to a crawler with no JavaScript`, async ({ request }) => {
      test.fixme(
        true,
        'Blocked by ROADMAP.md T-163 (open, opus/human-required): src/app/' +
          'layout.jsx wraps every page body in <ClerkLoaded>, which renders ' +
          'nothing server-side, so this page\'s Product script is absent from ' +
          'the raw HTML a crawler reads. Remove this line once T-163 ships - ' +
          'the assertions below are ready to go.'
      );

      expect(path, `${idEnvVarName} is set by scripts/e2e.mjs`).not.toContain('undefined');

      const html = await (await request.get(path)).text();
      const elements = [...html.matchAll(JSON_LD_ELEMENT)].map(match => JSON.parse(match[1]));

      const productEntries = elements.filter(entry => entry['@type'] === 'Product');
      expect(productEntries).toHaveLength(1);
      assertProductEntry(productEntries[0], path, price);
      expect(elements.filter(entry => entry['@type'] === 'Organization')).toHaveLength(1);
    });
  }
});
