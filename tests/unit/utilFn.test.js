import { describe, expect, it } from 'vitest';

import {
  formatPhone,
  formatValue,
  parseIfJSON,
  priceFormat,
} from '@/utils/utilFn';

describe('priceFormat', () => {
  it('formatea con separador de miles y sin decimales', () => {
    expect(priceFormat(1500)).toBe('$1,500');
    expect(priceFormat(12000)).toBe('$12,000');
  });

  it('formatea el cero', () => {
    expect(priceFormat(0)).toBe('$0');
  });

  it('conserva hasta dos decimales cuando el precio los tiene', () => {
    expect(priceFormat(1500.5)).toBe('$1,500.5');
    expect(priceFormat(1500.567)).toBe('$1,500.57');
  });
});

describe('formatValue', () => {
  it('formatea los valores positivos igual que priceFormat', () => {
    expect(formatValue(2500)).toBe('$2,500');
  });

  it('devuelve cadena vacia para cero y negativos', () => {
    expect(formatValue(0)).toBe('');
    expect(formatValue(-100)).toBe('');
  });
});

describe('parseIfJSON', () => {
  it('parsea JSON valido', () => {
    expect(parseIfJSON('{"nombre":"Arepa"}')).toEqual({ nombre: 'Arepa' });
    expect(parseIfJSON('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('devuelve el valor original si no es JSON valido', () => {
    expect(parseIfJSON('Arepa de queso')).toBe('Arepa de queso');
    expect(parseIfJSON('')).toBe('');
  });

  it('no toca los valores que no son string', () => {
    expect(parseIfJSON(42)).toBe(42);
    expect(parseIfJSON(null)).toBe(null);
    expect(parseIfJSON(undefined)).toBe(undefined);

    const obj = { ya: 'parseado' };
    expect(parseIfJSON(obj)).toBe(obj);
  });

  it('convierte los strings que son JSON escalar valido', () => {
    // Comportamiento actual: 'true' y '42' son JSON valido, asi que salen
    // convertidos a boolean y number. Documentado, no necesariamente deseado.
    expect(parseIfJSON('true')).toBe(true);
    expect(parseIfJSON('42')).toBe(42);
  });
});

describe('formatPhone', () => {
  it('formatea un numero de 10 digitos', () => {
    expect(formatPhone('3001234567')).toBe('(300) 123-4567');
  });

  it('acepta un number ademas de un string', () => {
    expect(formatPhone(3001234567)).toBe('(300) 123-4567');
  });

  it('limpia los caracteres que no son digitos', () => {
    expect(formatPhone('300 123 4567')).toBe('(300) 123-4567');
    expect(formatPhone('300-123-4567')).toBe('(300) 123-4567');
  });

  it('trunca a 10 digitos', () => {
    expect(formatPhone('30012345671234')).toBe('(300) 123-4567');
  });

  it('devuelve cadena vacia sin telefono', () => {
    expect(formatPhone(null)).toBe('');
    expect(formatPhone(undefined)).toBe('');
    expect(formatPhone('')).toBe('');
  });

  it('formatea parcialmente los numeros incompletos', () => {
    expect(formatPhone('300')).toBe('300');
    expect(formatPhone('3001')).toBe('(300) 1');
    expect(formatPhone('300123')).toBe('(300) 123');
  });
});
