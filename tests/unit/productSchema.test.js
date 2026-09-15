import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import { Product } from '@/utils/models/productSchema';
import { antojosCategories } from '@/utils/resources/categories';
import { marketplaceCategories } from '@/utils/resources/marketplaceCategories';

// validateSync() validates in memory: no Mongo connection needed. On top of
// that, `category`'s validator depends on `this.section`, and `this` is only
// bound to the document in document validation (not in update validation).
const buildProduct = overrides =>
  new Product({
    name: 'Arepa de queso',
    price: 5000,
    sellerId: new mongoose.Types.ObjectId(),
    description: 'Arepa recien hecha, con queso costeno',
    images: ['https://ik.imagekit.io/test/arepa.jpg'],
    ...overrides,
  });

const categoryError = doc => doc.validateSync()?.errors?.category;

describe('productSchema · categories per section', () => {
  it('accepts an antojos category in the antojos section', () => {
    const doc = buildProduct({ section: 'antojos', category: ['Dulces'] });
    expect(categoryError(doc)).toBeUndefined();
  });

  it('rejects a marketplace category in the antojos section', () => {
    const doc = buildProduct({ section: 'antojos', category: ['Tecnología'] });
    expect(categoryError(doc)?.message).toBe(
      'Las categorías deben pertenecer a la sección del producto'
    );
  });

  it('accepts a marketplace category in the marketplace section', () => {
    const doc = buildProduct({ section: 'marketplace', category: ['Termos'] });
    expect(categoryError(doc)).toBeUndefined();
  });

  it('rejects an antojos category in the marketplace section', () => {
    const doc = buildProduct({
      section: 'marketplace',
      category: ['Frituras'],
    });
    expect(categoryError(doc)).toBeDefined();
  });

  it('rejects if just one of several categories is from another section', () => {
    const doc = buildProduct({
      section: 'antojos',
      category: ['Dulces', 'Galletas', 'Libros'],
    });
    expect(categoryError(doc)).toBeDefined();
  });

  it('accepts several valid categories from the same section', () => {
    const doc = buildProduct({
      section: 'antojos',
      category: ['Dulces', 'Galletas', 'Snacks'],
    });
    expect(categoryError(doc)).toBeUndefined();
  });

  it('accepts "Otros", which exists in both lists', () => {
    expect(antojosCategories).toContain('Otros');
    expect(marketplaceCategories).toContain('Otros');

    for (const section of ['antojos', 'marketplace']) {
      const doc = buildProduct({ section, category: ['Otros'] });
      expect(categoryError(doc)).toBeUndefined();
    }
  });

  it('rejects a category that exists in neither list', () => {
    const doc = buildProduct({ section: 'antojos', category: ['Inventada'] });
    expect(categoryError(doc)).toBeDefined();
  });
});

describe('productSchema · default section', () => {
  it('uses "antojos" when no section is sent', () => {
    const doc = buildProduct({ category: ['Dulces'] });
    expect(doc.section).toBe('antojos');
    expect(categoryError(doc)).toBeUndefined();
  });

  it('validates against antojos when the section is the default', () => {
    const doc = buildProduct({ category: ['Termos'] });
    expect(categoryError(doc)).toBeDefined();
  });

  it('rejects a section outside the enum', () => {
    const doc = buildProduct({ section: 'inventada', category: ['Dulces'] });
    expect(doc.validateSync()?.errors?.section).toBeDefined();
  });
});
