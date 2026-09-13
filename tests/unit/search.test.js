import { describe, expect, it } from 'vitest';

import { buildAccentInsensitiveRegex } from '@/utils/lib/search';

describe('buildAccentInsensitiveRegex', () => {
  it('un termino sin tilde encuentra el nombre con tilde', () => {
    expect(buildAccentInsensitiveRegex('cafe').test('Café con leche')).toBe(true);
  });

  it('un termino con tilde encuentra el nombre sin tilde', () => {
    expect(buildAccentInsensitiveRegex('limón').test('Postre de limon')).toBe(true);
  });

  it('la eñe matchea con o sin tilde de cualquier lado', () => {
    expect(buildAccentInsensitiveRegex('bunuelo').test('Buñuelo')).toBe(true);
    expect(buildAccentInsensitiveRegex('buñuelo').test('Bunuelo')).toBe(true);
  });

  it('sigue siendo insensible a mayusculas', () => {
    expect(buildAccentInsensitiveRegex('AREPA').test('arepa de queso')).toBe(true);
  });

  it('sigue matcheando por prefijo/substring, no por palabra completa', () => {
    // The case Mongo's $text does not cover: searching as you type.
    expect(buildAccentInsensitiveRegex('bro').test('Brownie de chocolate')).toBe(true);
    expect(buildAccentInsensitiveRegex('are').test('Arepa de queso')).toBe(true);
  });

  it('no encuentra un termino que de verdad no esta', () => {
    expect(buildAccentInsensitiveRegex('pizza').test('Arepa de queso')).toBe(false);
  });

  it('escapa caracteres especiales de regex en vez de romper', () => {
    expect(() => buildAccentInsensitiveRegex('2x1 (promo)')).not.toThrow();
    expect(buildAccentInsensitiveRegex('2x1 (promo)').test('2x1 (promo) de arepas')).toBe(
      true
    );
  });
});
