import { describe, expect, it } from 'vitest';

import {
  buildProductMetadata,
  buildSellerMetadata,
  titleMetadata,
} from '@/lib/metadata';

describe('titleMetadata (T-76)', () => {
  // The bug this replaced: `template: 'Mercampus'` with no %s. Next.js renders
  // a template without a placeholder literally, so every page that set a plain
  // `title` came out as just 'Mercampus'.
  it('the template interpolates the page title', () => {
    expect(titleMetadata.template).toContain('%s');
  });

  it('the template keeps the site name as a suffix', () => {
    expect(titleMetadata.template).toBe('%s · Mercampus');
  });

  it('a page with no title of its own falls back to the site name', () => {
    expect(titleMetadata.default).toBe('Mercampus');
  });
});

describe('buildProductMetadata', () => {
  const product = {
    name: 'Arepa de queso',
    description: 'Arepas y fritos recién hechos entre clases.',
    price: 6000,
    image: 'https://ik.imagekit.io/seed/arepa.jpg',
  };

  // T-76: this used to be a title.absolute with the suffix written by hand, to
  // step around the root layout's broken template. Now the template adds it.
  it('leaves the product name alone, so the template adds the suffix', () => {
    const metadata = buildProductMetadata(product);
    expect(metadata.title).toBe('Arepa de queso');
  });

  it('openGraph and twitter do carry the full title: the template does not apply to them', () => {
    const metadata = buildProductMetadata(product);
    expect(metadata.openGraph.title).toBe('Arepa de queso · Mercampus');
    expect(metadata.twitter.title).toBe('Arepa de queso · Mercampus');
  });

  it("uses the product's description as-is, in description/openGraph/twitter", () => {
    const metadata = buildProductMetadata(product);
    expect(metadata.description).toBe(product.description);
    expect(metadata.openGraph.description).toBe(product.description);
    expect(metadata.twitter.description).toBe(product.description);
  });

  it('falls back to the formatted price when there is no description', () => {
    const metadata = buildProductMetadata({ ...product, description: undefined });
    expect(metadata.description).toContain('6.000');
  });

  it('unwraps a description stored as a JSON string', () => {
    const metadata = buildProductMetadata({
      ...product,
      description: JSON.stringify('Descripción real'),
    });
    expect(metadata.description).toBe('Descripción real');
  });

  it('a description that parses to an object (not text) is used as-is, not as an object', () => {
    const metadata = buildProductMetadata({
      ...product,
      description: JSON.stringify({ blocks: [] }),
    });
    expect(typeof metadata.description).toBe('string');
  });

  it("puts the product's image in openGraph and twitter", () => {
    const metadata = buildProductMetadata(product);
    expect(metadata.openGraph.images).toEqual([{ url: product.image }]);
    expect(metadata.twitter.images).toEqual([{ url: product.image }]);
  });

  it('with no image, images stays undefined instead of an array with an empty url', () => {
    const metadata = buildProductMetadata({ ...product, image: undefined });
    expect(metadata.openGraph.images).toBeUndefined();
    expect(metadata.twitter.images).toBeUndefined();
  });
});

describe('buildSellerMetadata', () => {
  const seller = {
    businessName: 'Arepas El Parche',
    description: 'Arepas y fritos recién hechos entre clases.',
    slogan: 'De la plancha a tu clase',
    logo: 'https://ik.imagekit.io/seed/logo.png',
  };

  it('leaves the business name alone, so the template adds the suffix', () => {
    const metadata = buildSellerMetadata(seller);
    expect(metadata.title).toBe('Arepas El Parche');
  });

  it('openGraph and twitter do carry the full title', () => {
    const metadata = buildSellerMetadata(seller);
    expect(metadata.openGraph.title).toBe('Arepas El Parche · Mercampus');
    expect(metadata.twitter.title).toBe('Arepas El Parche · Mercampus');
  });

  it('prefers the description over the slogan when both exist', () => {
    const metadata = buildSellerMetadata(seller);
    expect(metadata.description).toBe(seller.description);
  });

  it('falls back to the slogan when there is no description', () => {
    const metadata = buildSellerMetadata({ ...seller, description: undefined });
    expect(metadata.description).toBe(seller.slogan);
  });

  it('falls back to generic text when there is neither description nor slogan', () => {
    const metadata = buildSellerMetadata({
      ...seller,
      description: undefined,
      slogan: undefined,
    });
    expect(metadata.description).toContain('Mercampus');
  });

  it("puts the seller's logo in openGraph and twitter", () => {
    const metadata = buildSellerMetadata(seller);
    expect(metadata.openGraph.images).toEqual([{ url: seller.logo }]);
    expect(metadata.twitter.images).toEqual([{ url: seller.logo }]);
  });
});
