import { describe, expect, it } from 'vitest';

import { buildAccentInsensitiveRegex } from '@/utils/lib/search';

describe('buildAccentInsensitiveRegex', () => {
  it('a term with no accent finds the name with an accent', () => {
    expect(buildAccentInsensitiveRegex('cafe').test('Café con leche')).toBe(true);
  });

  it('a term with an accent finds the name with no accent', () => {
    expect(buildAccentInsensitiveRegex('limón').test('Postre de limon')).toBe(true);
  });

  it('the ñ matches with or without an accent on either side', () => {
    expect(buildAccentInsensitiveRegex('bunuelo').test('Buñuelo')).toBe(true);
    expect(buildAccentInsensitiveRegex('buñuelo').test('Bunuelo')).toBe(true);
  });

  it('stays case-insensitive', () => {
    expect(buildAccentInsensitiveRegex('AREPA').test('arepa de queso')).toBe(true);
  });

  it('still matches by prefix/substring, not by whole word', () => {
    // The case Mongo's $text does not cover: searching as you type.
    expect(buildAccentInsensitiveRegex('bro').test('Brownie de chocolate')).toBe(true);
    expect(buildAccentInsensitiveRegex('are').test('Arepa de queso')).toBe(true);
  });

  it('does not find a term that truly is not there', () => {
    expect(buildAccentInsensitiveRegex('pizza').test('Arepa de queso')).toBe(false);
  });

  it('escapes special regex characters instead of breaking', () => {
    expect(() => buildAccentInsensitiveRegex('2x1 (promo)')).not.toThrow();
    expect(buildAccentInsensitiveRegex('2x1 (promo)').test('2x1 (promo) de arepas')).toBe(
      true
    );
  });
});
