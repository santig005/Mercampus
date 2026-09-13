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
  it('el template interpola el titulo de la pagina', () => {
    expect(titleMetadata.template).toContain('%s');
  });

  it('el template conserva el nombre del sitio como sufijo', () => {
    expect(titleMetadata.template).toBe('%s · Mercampus');
  });

  it('una pagina sin titulo propio cae al nombre del sitio', () => {
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
  it('deja el nombre del producto solo, para que el template le ponga el sufijo', () => {
    const metadata = buildProductMetadata(product);
    expect(metadata.title).toBe('Arepa de queso');
  });

  it('openGraph y twitter si llevan el titulo completo: el template no les aplica', () => {
    const metadata = buildProductMetadata(product);
    expect(metadata.openGraph.title).toBe('Arepa de queso · Mercampus');
    expect(metadata.twitter.title).toBe('Arepa de queso · Mercampus');
  });

  it('usa la descripcion del producto tal cual, en description/openGraph/twitter', () => {
    const metadata = buildProductMetadata(product);
    expect(metadata.description).toBe(product.description);
    expect(metadata.openGraph.description).toBe(product.description);
    expect(metadata.twitter.description).toBe(product.description);
  });

  it('cae al precio formateado cuando no hay descripcion', () => {
    const metadata = buildProductMetadata({ ...product, description: undefined });
    expect(metadata.description).toContain('6.000');
  });

  it('desenvuelve una descripcion guardada como string JSON', () => {
    const metadata = buildProductMetadata({
      ...product,
      description: JSON.stringify('Descripción real'),
    });
    expect(metadata.description).toBe('Descripción real');
  });

  it('una descripcion que parsea a un objeto (no texto) se usa tal cual, no como objeto', () => {
    const metadata = buildProductMetadata({
      ...product,
      description: JSON.stringify({ blocks: [] }),
    });
    expect(typeof metadata.description).toBe('string');
  });

  it('pone la imagen del producto en openGraph y twitter', () => {
    const metadata = buildProductMetadata(product);
    expect(metadata.openGraph.images).toEqual([{ url: product.image }]);
    expect(metadata.twitter.images).toEqual([{ url: product.image }]);
  });

  it('sin imagen, images queda undefined en vez de un array con url vacia', () => {
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

  it('deja el nombre del negocio solo, para que el template le ponga el sufijo', () => {
    const metadata = buildSellerMetadata(seller);
    expect(metadata.title).toBe('Arepas El Parche');
  });

  it('openGraph y twitter si llevan el titulo completo', () => {
    const metadata = buildSellerMetadata(seller);
    expect(metadata.openGraph.title).toBe('Arepas El Parche · Mercampus');
    expect(metadata.twitter.title).toBe('Arepas El Parche · Mercampus');
  });

  it('prefiere la descripcion sobre el slogan cuando ambas existen', () => {
    const metadata = buildSellerMetadata(seller);
    expect(metadata.description).toBe(seller.description);
  });

  it('cae al slogan cuando no hay descripcion', () => {
    const metadata = buildSellerMetadata({ ...seller, description: undefined });
    expect(metadata.description).toBe(seller.slogan);
  });

  it('cae a un texto generico cuando no hay descripcion ni slogan', () => {
    const metadata = buildSellerMetadata({
      ...seller,
      description: undefined,
      slogan: undefined,
    });
    expect(metadata.description).toContain('Mercampus');
  });

  it('pone el logo del vendedor en openGraph y twitter', () => {
    const metadata = buildSellerMetadata(seller);
    expect(metadata.openGraph.images).toEqual([{ url: seller.logo }]);
    expect(metadata.twitter.images).toEqual([{ url: seller.logo }]);
  });
});
