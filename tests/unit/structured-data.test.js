import { describe, expect, it } from 'vitest';

import { SITE_URL } from '@/lib/metadata';
import {
  buildOrganizationJsonLd,
  buildProductJsonLd,
  serializeJsonLd,
} from '@/lib/structured-data';

// LINE SEPARATOR / PARAGRAPH SEPARATOR, built from a code point instead of
// a backslash-u escape in a string literal: that escape and the literal
// character it decodes to look identical on screen, which is exactly the
// bug this file pins down - keeping the two visibly different here avoids
// repeating it inside the test file itself.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

// T-152c. The full object, written out: a change to the emitted markup has to
// show up in this file's diff, not slip through a looser assertion.
describe('buildOrganizationJsonLd', () => {
  it('emits exactly this Organization', () => {
    expect(buildOrganizationJsonLd()).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Mercampus',
      url: 'https://mercampus.vercel.app/',
      logo: 'https://mercampus.vercel.app/images/logo.png',
      sameAs: ['https://www.instagram.com/mercampus/'],
    });
  });

  it('builds every URL on the canonical origin', () => {
    const { url, logo } = buildOrganizationJsonLd();
    expect(url.startsWith(`${SITE_URL}/`)).toBe(true);
    expect(logo.startsWith(`${SITE_URL}/`)).toBe(true);
  });
});

describe('serializeJsonLd', () => {
  it('round-trips through JSON.parse', () => {
    const data = buildOrganizationJsonLd();
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  // A value containing "</script>" must not be able to close the tag it is
  // rendered into.
  it('escapes "<" so a value cannot end the <script> tag', () => {
    const out = serializeJsonLd({ name: '</script><script>alert(1)</script>' });

    expect(out).not.toContain('<');
    expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
  });

  it('also escapes ">" and "&"', () => {
    const out = serializeJsonLd({ name: '--><!--&amp;' });

    expect(out).not.toContain('>');
    expect(out).not.toContain('&');
    expect(JSON.parse(out).name).toBe('--><!--&amp;');
  });

  it('escapes U+2028 and U+2029, which terminate a JS string literal', () => {
    const out = serializeJsonLd({ name: `line1${LINE_SEPARATOR}line2${PARAGRAPH_SEPARATOR}` });

    expect(out).not.toContain(LINE_SEPARATOR);
    expect(out).not.toContain(PARAGRAPH_SEPARATOR);
    expect(JSON.parse(out).name).toBe(`line1${LINE_SEPARATOR}line2${PARAGRAPH_SEPARATOR}`);
  });

  // T-151's own requirement: a hostile product NAME (not a hand-built
  // object) must not be able to break out of the <script> tag the product
  // page renders this into, even though serializeJsonLd already handles it
  // generically above.
  it('a product with a name that tries to close the <script> tag stays contained', () => {
    const hostileName = `</script><script>alert(1)</script>${LINE_SEPARATOR}`;
    const product = {
      name: hostileName,
      description: 'Arepa de maíz con queso costeño derretido.',
      price: 6000,
      images: ['https://ik.imagekit.io/seed/arepa.jpg'],
      section: 'antojos',
    };

    const out = serializeJsonLd(buildProductJsonLd('507f1f77bcf86cd799439011', product));

    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).not.toContain(LINE_SEPARATOR);
    expect(JSON.parse(out).name).toBe(hostileName);
  });
});

describe('buildProductJsonLd', () => {
  const antojo = {
    name: 'Arepa de queso',
    description: 'Arepa de maíz con queso costeño derretido.',
    price: 6000,
    images: ['https://ik.imagekit.io/seed/arepa.jpg'],
    section: 'antojos',
  };
  const id = '507f1f77bcf86cd799439011';

  it('emits exactly this Product + Offer, for an antojos product', () => {
    expect(buildProductJsonLd(id, antojo)).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Arepa de queso',
      description: 'Arepa de maíz con queso costeño derretido.',
      image: ['https://ik.imagekit.io/seed/arepa.jpg'],
      url: `${SITE_URL}/antojos/${id}`,
      offers: {
        '@type': 'Offer',
        url: `${SITE_URL}/antojos/${id}`,
        price: 6000,
        priceCurrency: 'COP',
      },
    });
  });

  it('a marketplace product gets a /marketplace/<id> url, not /antojos/<id>', () => {
    const data = buildProductJsonLd(id, { ...antojo, section: 'marketplace' });
    expect(data.url).toBe(`${SITE_URL}/marketplace/${id}`);
    expect(data.offers.url).toBe(`${SITE_URL}/marketplace/${id}`);
  });

  // No stock concept exists yet (T-145 is not done) and the page's own
  // "available/off/closed/no-schedule" badge answers a different question
  // (is the store open right now, not is this item in stock) - see the
  // comment in src/lib/structured-data.ts. Emitting it would risk a manual
  // action for disagreeing with the page.
  it('never emits offers.availability', () => {
    expect(buildProductJsonLd(id, antojo).offers).not.toHaveProperty('availability');
    expect(
      buildProductJsonLd(id, { ...antojo, section: 'marketplace' }).offers
    ).not.toHaveProperty('availability');
  });

  it('omits "image" rather than emitting an empty array, when the product has none', () => {
    const data = buildProductJsonLd(id, { ...antojo, images: [] });
    expect(data).not.toHaveProperty('image');
  });

  it('unwraps a description stored as a JSON string, like the Open Graph builder does', () => {
    const data = buildProductJsonLd(id, {
      ...antojo,
      description: JSON.stringify('Plain text from a rich editor.'),
    });
    expect(data.description).toBe('Plain text from a rich editor.');
  });

  it('never invents rating, review, brand or sku', () => {
    const data = buildProductJsonLd(id, antojo);
    for (const key of ['aggregateRating', 'review', 'brand', 'sku']) {
      expect(data).not.toHaveProperty(key);
    }
  });
});
