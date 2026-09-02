import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import { Product } from '@/utils/models/productSchema';
import { antojosCategories } from '@/utils/resources/categories';
import { marketplaceCategories } from '@/utils/resources/marketplaceCategories';

// validateSync() valida en memoria: no hace falta conexion a Mongo. Ademas el
// validador de `category` depende de `this.section`, y `this` solo esta ligado
// al documento en la validacion de documento (no en las de update).
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

describe('productSchema · categorias por seccion', () => {
  it('acepta una categoria de antojos en la seccion antojos', () => {
    const doc = buildProduct({ section: 'antojos', category: ['Dulces'] });
    expect(categoryError(doc)).toBeUndefined();
  });

  it('rechaza una categoria de marketplace en la seccion antojos', () => {
    const doc = buildProduct({ section: 'antojos', category: ['Tecnología'] });
    expect(categoryError(doc)?.message).toBe(
      'Las categorías deben pertenecer a la sección del producto'
    );
  });

  it('acepta una categoria de marketplace en la seccion marketplace', () => {
    const doc = buildProduct({ section: 'marketplace', category: ['Termos'] });
    expect(categoryError(doc)).toBeUndefined();
  });

  it('rechaza una categoria de antojos en la seccion marketplace', () => {
    const doc = buildProduct({
      section: 'marketplace',
      category: ['Frituras'],
    });
    expect(categoryError(doc)).toBeDefined();
  });

  it('rechaza si una sola de varias categorias es de otra seccion', () => {
    const doc = buildProduct({
      section: 'antojos',
      category: ['Dulces', 'Galletas', 'Libros'],
    });
    expect(categoryError(doc)).toBeDefined();
  });

  it('acepta varias categorias validas de la misma seccion', () => {
    const doc = buildProduct({
      section: 'antojos',
      category: ['Dulces', 'Galletas', 'Snacks'],
    });
    expect(categoryError(doc)).toBeUndefined();
  });

  it('acepta "Otros", que existe en ambas listas', () => {
    expect(antojosCategories).toContain('Otros');
    expect(marketplaceCategories).toContain('Otros');

    for (const section of ['antojos', 'marketplace']) {
      const doc = buildProduct({ section, category: ['Otros'] });
      expect(categoryError(doc)).toBeUndefined();
    }
  });

  it('rechaza una categoria que no existe en ninguna lista', () => {
    const doc = buildProduct({ section: 'antojos', category: ['Inventada'] });
    expect(categoryError(doc)).toBeDefined();
  });
});

describe('productSchema · seccion por defecto', () => {
  it('usa "antojos" cuando no se envia seccion', () => {
    const doc = buildProduct({ category: ['Dulces'] });
    expect(doc.section).toBe('antojos');
    expect(categoryError(doc)).toBeUndefined();
  });

  it('valida contra antojos cuando la seccion viene por defecto', () => {
    const doc = buildProduct({ category: ['Termos'] });
    expect(categoryError(doc)).toBeDefined();
  });

  it('rechaza una seccion fuera del enum', () => {
    const doc = buildProduct({ section: 'inventada', category: ['Dulces'] });
    expect(doc.validateSync()?.errors?.section).toBeDefined();
  });
});
