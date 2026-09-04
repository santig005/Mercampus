import { toNationalPhone } from '@/lib/phone';

// Mercampus es un marketplace colombiano: los precios van en pesos y los
// teléfonos en el formato nacional de 10 dígitos.
const CURRENCY_LOCALE = 'es-CO';
const CURRENCY = 'COP';

// Ojo: `es-CO` separa el símbolo del importe con un espacio duro (U+00A0),
// así que 1500 sale como '$ 1.500'. Es la forma canónica del locale.
// `maximumFractionDigits` va explicito a proposito: para COP su valor por
// defecto depende de la version de ICU (0 en el runner del CI, 2 en el Node
// 22.20 local), asi que sin fijarlo el mismo precio se ve distinto segun la
// maquina. Cero es ademas lo correcto: no circulan centavos de peso y el
// precio es entero en `productSchema`.
const currencyFormatter = new Intl.NumberFormat(CURRENCY_LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
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

export const formatPhone = phone => {
  if (!phone) return ''; // Si phone es null/undefined, retorna vacío

  // El normalizador vive en `@/lib/phone` porque el schema de Zod valida el
  // teléfono con el mismo criterio con el que se muestra aquí.
  const cleanPhone = toNationalPhone(phone);

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
