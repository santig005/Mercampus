import { describe, expect, it } from 'vitest';

import {
  formatPhone,
  formatValue,
  parseIfJSON,
  priceFormat,
} from '@/utils/utilFn';

// `es-CO` mete un espacio duro entre el simbolo y el importe. Se nombra aparte
// para que los tests no dependan de un caracter invisible en el literal.
const NBSP = ' ';

describe('priceFormat', () => {
  it('formatea en pesos colombianos: punto de miles y sin decimales', () => {
    expect(priceFormat(1500)).toBe(`$${NBSP}1.500`);
    expect(priceFormat(12000)).toBe(`$${NBSP}12.000`);
  });

  it('formatea el cero', () => {
    expect(priceFormat(0)).toBe(`$${NBSP}0`);
  });

  it('redondea a pesos enteros', () => {
    // El precio es entero en el schema, y no circulan centavos de peso. El
    // maximo de decimales va fijado en la funcion porque su valor por defecto
    // para COP cambia con la version de ICU: sin fijarlo, 1500.5 sale
    // '$ 1.501' en el CI y '$ 1.500,5' en Node 22.20.
    expect(priceFormat(1500.5)).toBe(`$${NBSP}1.501`);
    expect(priceFormat(1500.567)).toBe(`$${NBSP}1.501`);
  });

  it('no usa el formato anglosajon', () => {
    expect(priceFormat(1500)).not.toBe('$1,500');
    expect(priceFormat(1500)).not.toContain(',');
  });
});

describe('formatValue', () => {
  it('formatea los valores positivos igual que priceFormat', () => {
    expect(formatValue(2500)).toBe(priceFormat(2500));
    expect(formatValue(2500)).toBe(`$${NBSP}2.500`);
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

  it('descarta el indicativo de pais +57', () => {
    expect(formatPhone('+573001234567')).toBe('(300) 123-4567');
    expect(formatPhone('+57 300 123 4567')).toBe('(300) 123-4567');
    expect(formatPhone('573001234567')).toBe('(300) 123-4567');
    expect(formatPhone(573001234567)).toBe('(300) 123-4567');
  });

  it('no confunde con el indicativo un numero nacional de 10 digitos', () => {
    // Ningun numero nacional empieza por 57, pero si llegara uno de 10 digitos
    // se respeta entero: el 57 solo sobra cuando hay mas de 10.
    expect(formatPhone('5730012345')).toBe('(573) 001-2345');
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
