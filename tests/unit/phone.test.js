import { describe, expect, it } from 'vitest';

import { isNationalPhone, toNationalPhone } from '@/lib/phone';
import { createSellerSchema } from '@/lib/validators/seller';

describe('toNationalPhone', () => {
  it('deja solo los digitos', () => {
    expect(toNationalPhone('300 123 4567')).toBe('3001234567');
    expect(toNationalPhone('(300) 123-4567')).toBe('3001234567');
  });

  it('acepta un number ademas de un string', () => {
    expect(toNationalPhone(3001234567)).toBe('3001234567');
  });

  it('descarta el indicativo de pais', () => {
    expect(toNationalPhone('+573001234567')).toBe('3001234567');
    expect(toNationalPhone('+57 300 123 4567')).toBe('3001234567');
    expect(toNationalPhone('573001234567')).toBe('3001234567');
  });

  it('no descarta un 57 que es parte de un numero de 10 digitos', () => {
    expect(toNationalPhone('5730012345')).toBe('5730012345');
  });

  it('trunca a 10 digitos', () => {
    expect(toNationalPhone('30012345671234')).toBe('3001234567');
  });

  it('devuelve cadena vacia sin valor', () => {
    expect(toNationalPhone(null)).toBe('');
    expect(toNationalPhone(undefined)).toBe('');
    expect(toNationalPhone('')).toBe('');
    expect(toNationalPhone('sin digitos')).toBe('');
  });
});

describe('isNationalPhone', () => {
  it('acepta 10 digitos', () => {
    expect(isNationalPhone('3001234567')).toBe(true);
    expect(isNationalPhone('6011234567')).toBe(true); // fijo, empieza por 60
  });

  it('rechaza longitudes distintas de 10', () => {
    expect(isNationalPhone('300123456')).toBe(false);
    expect(isNationalPhone('30012345678')).toBe(false);
    expect(isNationalPhone('')).toBe(false);
  });

  it('rechaza el cero delante', () => {
    // El telefono se guarda como Number: '0300123456' se convertiria en
    // 300123456 y perderia un digito sin que nadie se entere.
    expect(isNationalPhone('0300123456')).toBe(false);
  });

  it('rechaza lo que no son digitos', () => {
    expect(isNationalPhone('300-123-45')).toBe(false);
  });
});

describe('createSellerSchema · phoneNumber', () => {
  const parse = phoneNumber =>
    createSellerSchema.safeParse({ businessName: 'Arepas Ana', phoneNumber });

  it('entrega un number aunque el formulario mande un string', () => {
    // El schema de Mongoose declara Number. Que Mongoose sepa convertir el
    // string por su cuenta no vale: el contrato del validador es entregar el
    // dato ya con el tipo del modelo.
    const parsed = parse('3001234567');

    expect(parsed.success).toBe(true);
    expect(parsed.data.phoneNumber).toBe(3001234567);
    expect(typeof parsed.data.phoneNumber).toBe('number');
  });

  it('sigue aceptando un number', () => {
    expect(parse(3001234567).data.phoneNumber).toBe(3001234567);
  });

  it('normaliza el formato y el indicativo antes de convertir', () => {
    expect(parse('(300) 123-4567').data.phoneNumber).toBe(3001234567);
    expect(parse('+57 300 123 4567').data.phoneNumber).toBe(3001234567);
  });

  it('rechaza lo que no es un telefono nacional', () => {
    expect(parse('300 12').success).toBe(false);
    expect(parse('abc').success).toBe(false);
    expect(parse('0300123456').success).toBe(false);
    expect(parse('').success).toBe(false);
  });
});
