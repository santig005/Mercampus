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
