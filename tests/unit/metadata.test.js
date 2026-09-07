import { describe, expect, it } from 'vitest';

import { buildProductMetadata, buildSellerMetadata } from '@/lib/metadata';

describe('buildProductMetadata', () => {
  const product = {
    name: 'Arepa de queso',
    description: 'Arepas y fritos recién hechos entre clases.',
    price: 6000,
    image: 'https://ik.imagekit.io/seed/arepa.jpg',
  };

  it('usa title.absolute para saltarse el template roto del layout raiz', () => {
    const metadata = buildProductMetadata(product);
    expect(metadata.title).toEqual({ absolute: 'Arepa de queso · Mercampus' });
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

  it('usa title.absolute con el nombre del negocio', () => {
    const metadata = buildSellerMetadata(seller);
    expect(metadata.title).toEqual({ absolute: 'Arepas El Parche · Mercampus' });
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
