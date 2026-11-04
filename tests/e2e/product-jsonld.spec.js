import { expect, test } from '@playwright/test';

// T-151: the product detail pages (/antojos/<id>, /marketplace/<id>) emit
// Product + Offer JSON-LD. Read the same way as the Organization check in
// home.spec.js - the raw server response, with no browser, the way a
// crawler sees it. The root layout's own Organization script is still on
// this page too (every page gets it), so each assertion picks the element
// by '@type' instead of assuming there is only one.
const JSON_LD_ELEMENT = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;

const PRODUCT_ID = process.env.E2E_PRODUCT_ID; // 'Arepa de queso', antojos, 6000 COP
const MARKETPLACE_PRODUCT_ID = process.env.E2E_MARKETPLACE_PRODUCT_ID; // 'Termo Mercampus', marketplace, 45000 COP

test.describe('Product JSON-LD in the server HTML (T-151)', () => {
  for (const { path, idEnvVarName, section, price } of [
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
  ]) {
    test(`${section}: one Product JSON-LD element, before any JavaScript runs`, async ({
      request,
      page,
    }) => {
      expect(path, `${idEnvVarName} is set by scripts/e2e.mjs`).not.toContain('undefined');

      const html = await (await request.get(path)).text();
      const elements = [...html.matchAll(JSON_LD_ELEMENT)].map(match => JSON.parse(match[1]));

      const productEntries = elements.filter(entry => entry['@type'] === 'Product');
      expect(productEntries).toHaveLength(1);
      const data = productEntries[0];

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

      // The root layout's Organization script is unaffected: still exactly
      // one, same as every other page.
      expect(elements.filter(entry => entry['@type'] === 'Organization')).toHaveLength(1);

      // And hydration does not add a second copy of either.
      await page.goto(path);
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(2);
    });
  }
});
