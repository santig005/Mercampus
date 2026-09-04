// Mercampus es un marketplace colombiano: los precios van en pesos y los
// teléfonos en el formato nacional de 10 dígitos.
const CURRENCY_LOCALE = 'es-CO';
const CURRENCY = 'COP';
const COUNTRY_CODE = '57';
const NATIONAL_DIGITS = 10;

// Ojo: `es-CO` separa el símbolo del importe con un espacio duro (U+00A0),
// así que 1500 sale como '$ 1.500'. Es la forma canónica del locale.
const currencyFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 0,
  useGrouping: true,
});

export const priceFormat = price => currencyFormatter.format(price);

export const parseIfJSON = value => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value; // Si no es JSON válido, devolver el valor original
  }
};

export const formatValue = value => (value > 0 ? priceFormat(value) : '');

// Deja el número en su forma nacional de 10 dígitos. Ningún número colombiano
// nacional empieza por 57 (los móviles empiezan por 3 y los fijos por 60), así
// que un 57 delante de más de 10 dígitos solo puede ser el indicativo de país
// de un `+57` y sobra.
const toNationalPhone = digits =>
  (digits.length > NATIONAL_DIGITS && digits.startsWith(COUNTRY_CODE)
    ? digits.slice(COUNTRY_CODE.length)
    : digits
  ).slice(0, NATIONAL_DIGITS);

export const formatPhone = phone => {
  if (!phone) return ''; // Si phone es null/undefined, retorna vacío

  const cleanPhone = toNationalPhone(phone.toString().replace(/\D/g, ''));

  if (cleanPhone.length > 6) {
    return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(
      3,
      6
    )}-${cleanPhone.slice(6)}`;
  } else if (cleanPhone.length > 3) {
    return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3)}`;
  } else {
    return cleanPhone; // Si tiene menos de 3 dígitos, solo muestra los números
  }
};
