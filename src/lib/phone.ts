const COUNTRY_CODE = '57';
const NATIONAL_DIGITS = 10;

/**
 * Deja un teléfono en su forma nacional colombiana: solo dígitos, sin
 * indicativo de país y como mucho 10.
 *
 * El `57` se descarta únicamente cuando quedan más de 10 dígitos: ningún
 * número nacional empieza por 57 (los móviles empiezan por 3 y los fijos por
 * 60), pero si llegara uno de exactamente 10 dígitos, quitárselo se comería
 * los tres primeros.
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
 * Un número nacional válido tiene 10 dígitos y no empieza por cero. Lo del
 * cero importa porque el teléfono se guarda como `Number` en Mongoose: un
 * `'0300123456'` se convertiría en 300123456 y perdería un dígito en silencio.
 */
export const isNationalPhone = (digits: string): boolean =>
  /^[1-9]\d{9}$/.test(digits);
