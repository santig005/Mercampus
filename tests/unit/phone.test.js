import { describe, expect, it } from 'vitest';

import { isNationalPhone, toNationalPhone } from '@/lib/phone';
import { createSellerSchema } from '@/lib/validators/seller';

describe('toNationalPhone', () => {
  it('keeps only the digits', () => {
    expect(toNationalPhone('300 123 4567')).toBe('3001234567');
    expect(toNationalPhone('(300) 123-4567')).toBe('3001234567');
  });

  it('accepts a number as well as a string', () => {
    expect(toNationalPhone(3001234567)).toBe('3001234567');
  });

  it('drops the country code', () => {
    expect(toNationalPhone('+573001234567')).toBe('3001234567');
    expect(toNationalPhone('+57 300 123 4567')).toBe('3001234567');
    expect(toNationalPhone('573001234567')).toBe('3001234567');
  });

  it('does not drop a 57 that is part of a 10-digit number', () => {
    expect(toNationalPhone('5730012345')).toBe('5730012345');
  });

  it('truncates to 10 digits', () => {
    expect(toNationalPhone('30012345671234')).toBe('3001234567');
  });

  it('returns an empty string with no value', () => {
    expect(toNationalPhone(null)).toBe('');
    expect(toNationalPhone(undefined)).toBe('');
    expect(toNationalPhone('')).toBe('');
    expect(toNationalPhone('sin digitos')).toBe('');
  });
});

describe('isNationalPhone', () => {
  it('accepts 10 digits', () => {
    expect(isNationalPhone('3001234567')).toBe(true);
    expect(isNationalPhone('6011234567')).toBe(true); // a landline, starts with 60
  });

  it('rejects lengths other than 10', () => {
    expect(isNationalPhone('300123456')).toBe(false);
    expect(isNationalPhone('30012345678')).toBe(false);
    expect(isNationalPhone('')).toBe(false);
  });

  it('rejects a leading zero', () => {
    // El telefono se guarda como Number: '0300123456' se convertiria en
    // 300123456 and would lose a digit without anyone noticing.
    expect(isNationalPhone('0300123456')).toBe(false);
  });

  it('rejects what is not digits', () => {
    expect(isNationalPhone('300-123-45')).toBe(false);
  });
});

describe('createSellerSchema · phoneNumber', () => {
  const parse = phoneNumber =>
    createSellerSchema.safeParse({ businessName: 'Arepas Ana', phoneNumber });

  it('hands back a number even when the form sends a string', () => {
    // The Mongoose schema declares Number. Mongoose being able to cast the
    // string on its own does not count: the validator's contract is to hand
    // over the value already in the model's type.
    const parsed = parse('3001234567');

    expect(parsed.success).toBe(true);
    expect(parsed.data.phoneNumber).toBe(3001234567);
    expect(typeof parsed.data.phoneNumber).toBe('number');
  });

  it('still accepts a number', () => {
    expect(parse(3001234567).data.phoneNumber).toBe(3001234567);
  });

  it('normalizes the format and the country code before converting', () => {
    expect(parse('(300) 123-4567').data.phoneNumber).toBe(3001234567);
    expect(parse('+57 300 123 4567').data.phoneNumber).toBe(3001234567);
  });

  it('rejects what is not a national phone number', () => {
    expect(parse('300 12').success).toBe(false);
    expect(parse('abc').success).toBe(false);
    expect(parse('0300123456').success).toBe(false);
    expect(parse('').success).toBe(false);
  });
});
