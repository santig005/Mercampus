import { describe, expect, it } from 'vitest';

import {
  formatPhone,
  formatValue,
  parseIfJSON,
  priceFormat,
} from '@/utils/utilFn';

// `es-CO` puts a non-breaking space between the symbol and the amount. It is
// named separately so the tests do not depend on an invisible character.
const NBSP = ' ';

describe('priceFormat', () => {
  it('formats in Colombian pesos: thousands dot and no decimals', () => {
    expect(priceFormat(1500)).toBe(`$${NBSP}1.500`);
    expect(priceFormat(12000)).toBe(`$${NBSP}12.000`);
  });

  it('formats zero', () => {
    expect(priceFormat(0)).toBe(`$${NBSP}0`);
  });

  it('rounds to whole pesos', () => {
    // El precio es entero en el schema, y no circulan centavos de peso. El
    // the maximum fraction digits is pinned in the function because its default
    // for COP changes with the ICU version: without pinning it, 1500.5 comes out
    // '$ 1.501' en el CI y '$ 1.500,5' en Node 22.20.
    expect(priceFormat(1500.5)).toBe(`$${NBSP}1.501`);
    expect(priceFormat(1500.567)).toBe(`$${NBSP}1.501`);
  });

  it('does not use the Anglo format', () => {
    expect(priceFormat(1500)).not.toBe('$1,500');
    expect(priceFormat(1500)).not.toContain(',');
  });
});

describe('formatValue', () => {
  it('formats positive values the same as priceFormat', () => {
    expect(formatValue(2500)).toBe(priceFormat(2500));
    expect(formatValue(2500)).toBe(`$${NBSP}2.500`);
  });

  it('returns an empty string for zero and negatives', () => {
    expect(formatValue(0)).toBe('');
    expect(formatValue(-100)).toBe('');
  });
});

describe('parseIfJSON', () => {
  it('parses valid JSON', () => {
    expect(parseIfJSON('{"nombre":"Arepa"}')).toEqual({ nombre: 'Arepa' });
    expect(parseIfJSON('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('returns the original value if it is not valid JSON', () => {
    expect(parseIfJSON('Arepa de queso')).toBe('Arepa de queso');
    expect(parseIfJSON('')).toBe('');
  });

  it('does not touch values that are not a string', () => {
    expect(parseIfJSON(42)).toBe(42);
    expect(parseIfJSON(null)).toBe(null);
    expect(parseIfJSON(undefined)).toBe(undefined);

    const obj = { ya: 'parseado' };
    expect(parseIfJSON(obj)).toBe(obj);
  });

  it('converts strings that are valid scalar JSON', () => {
    // Current behaviour: 'true' and '42' are valid JSON, so they come back
    // convertidos a boolean y number. Documentado, no necesariamente deseado.
    expect(parseIfJSON('true')).toBe(true);
    expect(parseIfJSON('42')).toBe(42);
  });
});

describe('formatPhone', () => {
  it('formats a 10-digit number', () => {
    expect(formatPhone('3001234567')).toBe('(300) 123-4567');
  });

  it('accepts a number as well as a string', () => {
    expect(formatPhone(3001234567)).toBe('(300) 123-4567');
  });

  it('strips characters that are not digits', () => {
    expect(formatPhone('300 123 4567')).toBe('(300) 123-4567');
    expect(formatPhone('300-123-4567')).toBe('(300) 123-4567');
  });

  it('drops the +57 country code', () => {
    expect(formatPhone('+573001234567')).toBe('(300) 123-4567');
    expect(formatPhone('+57 300 123 4567')).toBe('(300) 123-4567');
    expect(formatPhone('573001234567')).toBe('(300) 123-4567');
    expect(formatPhone(573001234567)).toBe('(300) 123-4567');
  });

  it('does not confuse a 10-digit national number with the country code', () => {
    // No national number starts with 57, but if one of 10 digits did arrive it
    // is kept whole: the 57 is only surplus when there are more than 10.
    expect(formatPhone('5730012345')).toBe('(573) 001-2345');
  });

  it('truncates to 10 digits', () => {
    expect(formatPhone('30012345671234')).toBe('(300) 123-4567');
  });

  it('returns an empty string with no phone number', () => {
    expect(formatPhone(null)).toBe('');
    expect(formatPhone(undefined)).toBe('');
    expect(formatPhone('')).toBe('');
  });

  it('partially formats incomplete numbers', () => {
    expect(formatPhone('300')).toBe('300');
    expect(formatPhone('3001')).toBe('(300) 1');
    expect(formatPhone('300123')).toBe('(300) 123');
  });
});
