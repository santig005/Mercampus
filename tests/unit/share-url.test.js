import { describe, expect, it } from 'vitest';

import { buildShareUrl } from '@/lib/share-url';

// T-132: ShareButton.jsx used to hardcode /antojos for every product,
// regardless of its own `section`. A marketplace product then shared a link
// that opened fine (neither detail page filters by section) but sent the
// recipient back to /antojos instead of /marketplace, because ProductPage
// defaults its `section` prop from the URL it landed on.

const ORIGIN = 'https://mercampus.vercel.app';

describe('buildShareUrl', () => {
  it('shares an antojos product under /antojos', () => {
    const url = buildShareUrl({
      origin: ORIGIN,
      type: 'product',
      data: { _id: 'p1', section: 'antojos' },
    });

    expect(url).toBe(`${ORIGIN}/antojos/p1?source=share`);
  });

  it('shares a marketplace product under /marketplace, not /antojos', () => {
    const url = buildShareUrl({
      origin: ORIGIN,
      type: 'product',
      data: { _id: 'p2', section: 'marketplace' },
    });

    expect(url).toBe(`${ORIGIN}/marketplace/p2?source=share`);
  });

  it('falls back to antojos for a product with no section, matching ProductPage default', () => {
    const url = buildShareUrl({
      origin: ORIGIN,
      type: 'product',
      data: { _id: 'p3' },
    });

    expect(url).toBe(`${ORIGIN}/antojos/p3?source=share`);
  });

  // Not the T-132 bug: seller profiles live only under /antojos/sellers, in
  // both sections. This is the correct, unchanged behaviour.
  it('always shares a seller under /antojos/sellers, regardless of section', () => {
    const url = buildShareUrl({
      origin: ORIGIN,
      type: 'seller',
      data: { _id: 's1' },
    });

    expect(url).toBe(`${ORIGIN}/antojos/sellers/s1?source=share`);
  });

  it('returns an empty string for no data or an unknown type', () => {
    expect(buildShareUrl({ origin: ORIGIN, type: 'product', data: null })).toBe('');
    expect(
      buildShareUrl({ origin: ORIGIN, type: 'unknown', data: { _id: 'x' } })
    ).toBe('');
  });
});

// T-81 (human decision, 2026-09-17): a shared link carries the sharer's
// locale, now that the product detail zone is migrated. buildShareUrl reuses
// localizedHref (src/i18n/routing.ts) rather than re-implementing the
// prefixing rule, which is also why these use a real Mongo-ObjectId-shaped id
// - localizedHref's `dynamic` LOCALIZED_ROUTES entries only prefix a path
// shaped exactly like /antojos/<id> or /marketplace/<id>.
describe('buildShareUrl locale variants (T-81)', () => {
  const PRODUCT_ID = '652f1234567890abcdef1234'; // 24 hex chars, shaped like a Mongoose _id

  it('shares an antojos product with no prefix in the default locale (es)', () => {
    const url = buildShareUrl({
      origin: ORIGIN,
      type: 'product',
      data: { _id: PRODUCT_ID, section: 'antojos' },
      locale: 'es',
    });

    expect(url).toBe(`${ORIGIN}/antojos/${PRODUCT_ID}?source=share`);
  });

  it('prefixes an antojos product link for a non-default locale', () => {
    const url = buildShareUrl({
      origin: ORIGIN,
      type: 'product',
      data: { _id: PRODUCT_ID, section: 'antojos' },
      locale: 'en',
    });

    expect(url).toBe(`${ORIGIN}/en/antojos/${PRODUCT_ID}?source=share`);
  });

  it('prefixes a marketplace product link for a non-default locale', () => {
    const url = buildShareUrl({
      origin: ORIGIN,
      type: 'product',
      data: { _id: PRODUCT_ID, section: 'marketplace' },
      locale: 'en',
    });

    expect(url).toBe(`${ORIGIN}/en/marketplace/${PRODUCT_ID}?source=share`);
  });

  it('defaults to the app default locale (no prefix) when locale is omitted', () => {
    const url = buildShareUrl({
      origin: ORIGIN,
      type: 'product',
      data: { _id: PRODUCT_ID, section: 'antojos' },
    });

    expect(url).toBe(`${ORIGIN}/antojos/${PRODUCT_ID}?source=share`);
  });

  // T-81 (seller profile zone): /antojos/sellers/<id> is now a `dynamic`
  // LOCALIZED_ROUTES entry too, so a seller link carries the sharer's locale
  // exactly like a product link does. T-132's old note (stays bare, a
  // prefixed link would 404) no longer applies now that this zone is
  // migrated.
  it('prefixes a seller link for a non-default locale', () => {
    const url = buildShareUrl({
      origin: ORIGIN,
      type: 'seller',
      data: { _id: PRODUCT_ID },
      locale: 'en',
    });

    expect(url).toBe(`${ORIGIN}/en/antojos/sellers/${PRODUCT_ID}?source=share`);
  });
});
