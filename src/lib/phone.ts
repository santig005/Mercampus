const COUNTRY_CODE = '57';
const NATIONAL_DIGITS = 10;

/**
 * Reduces a phone number to its Colombian national form: digits only, no
 * country code, at most 10 of them.
 *
 * The `57` is dropped only when more than 10 digits remain: no national
 * number starts with 57 (mobiles start with 3 and landlines with 60), but if
 * one of exactly 10 digits ever arrived, stripping it would eat its first
 * three.
 */
export const toNationalPhone = (value: unknown): string => {
  if (value === null || value === undefined) return '';

  const digits = String(value).replace(/\D/g, '');

  return (
    digits.length > NATIONAL_DIGITS && digits.startsWith(COUNTRY_CODE)
      ? digits.slice(COUNTRY_CODE.length)
      : digits
  ).slice(0, NATIONAL_DIGITS);
};

/**
 * A valid national number has 10 digits and doesn't start with a zero. The
 * zero matters because the phone is stored as a `Number` in Mongoose: a
 * `'0300123456'` would become 300123456 and lose a digit silently.
 */
export const isNationalPhone = (digits: string): boolean =>
  /^[1-9]\d{9}$/.test(digits);
