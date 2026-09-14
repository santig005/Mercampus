import { describe, expect, it } from 'vitest';

import { toPesos } from '@/lib/price';
import { antojosCategories } from '@/utils/resources/categories';
import { createProductSchema, updateProductSchema } from '@/lib/validators/product';

describe('toPesos', () => {
  it('reads plain digits, as a string or as a number', () => {
    expect(toPesos('5000')).toBe(5000);
    expect(toPesos(' 12000 ')).toBe(12000);
    expect(toPesos(5000)).toBe(5000);
  });

  it('reads the dot as a thousands separator, the Colombian way', () => {
    expect(toPesos('5.000')).toBe(5000);
    expect(toPesos('1.100.000')).toBe(1100000);
  });

  it('also reads a comma used as a thousands separator', () => {
    expect(toPesos('5,000')).toBe(5000);
    expect(toPesos('1,100,000')).toBe(1100000);
  });

  it('ignores a currency sign, COP and spaces', () => {
    expect(toPesos('$5.000')).toBe(5000);
    expect(toPesos('$ 5.000')).toBe(5000);
    expect(toPesos('5.000 COP')).toBe(5000);
  });

  it('refuses what it would have to guess at, instead of storing a wrong price', () => {
    for (const value of ['5,5', '5.50', '1.000,50', '1.000,000', '12.34.5', '5.0000']) {
      expect(toPesos(value), value).toBeNaN();
    }
  });

  it('refuses what is not a price at all', () => {
    for (const value of ['', 'gratis', '-5000', null, undefined, true]) {
      expect(toPesos(value), String(value)).toBeNaN();
    }
  });
});

// The regression itself. This is the shape /antojos/product/add sends, with
// the price as the string its text input holds. Until this change every such
// request answered 400 "Datos inválidos" in production, and had since T-13
// put Zod on this edge.
describe('the product schemas take the price the way the forms send it', () => {
  const form = {
    name: 'Helado napolitano',
    section: 'antojos',
    category: [antojosCategories[0]],
    description: 'Tres sabores',
    images: ['https://ik.imagekit.io/example/products/helado.jpg'],
  };

  it('creates a product from "5000" and from "5.000", storing 5000 both times', () => {
    for (const price of ['5000', '5.000', '$ 5.000']) {
      const result = createProductSchema.safeParse({ ...form, price });
      expect(result.success, price).toBe(true);
      expect(result.data.price, price).toBe(5000);
    }
  });

  it('still takes a plain number, as any other client would send it', () => {
    const result = createProductSchema.safeParse({ ...form, price: 5000 });
    expect(result.success).toBe(true);
    expect(result.data.price).toBe(5000);
  });

  it('never reads "5.000" as five', () => {
    const result = createProductSchema.safeParse({ ...form, price: '5.000' });
    expect(result.data?.price).not.toBe(5);
  });

  it('rejects an ambiguous or non-numeric price and names the field', () => {
    for (const price of ['5,5', 'gratis', '']) {
      const result = createProductSchema.safeParse({ ...form, price });
      expect(result.success, price).toBe(false);
      expect(result.error.issues.map(issue => issue.path.join('.')), price).toContain('price');
    }
  });

  it('accepts the edit form sending the price alone, as a string', () => {
    const result = updateProductSchema.safeParse({ price: '9.000' });
    expect(result.success).toBe(true);
    expect(result.data.price).toBe(9000);
  });
});
