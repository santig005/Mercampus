import { toNationalPhone } from '@/lib/phone';

// Mercampus is a Colombian marketplace: prices are in pesos and phone
// numbers in the 10-digit national format.
const CURRENCY_LOCALE = 'es-CO';
const CURRENCY = 'COP';

// Careful: `es-CO` separates the symbol from the amount with a non-breaking
// space (U+00A0), so 1500 comes out as '$ 1.500'. That is the locale's
// canonical form. `maximumFractionDigits` is set explicitly on purpose: for
// COP its default depends on the ICU version (0 on the CI runner, 2 on the
// local Node 22.20), so without pinning it the same price looks different
// depending on the machine. Zero is also the correct value: peso cents do not
// circulate and the price is an integer in `productSchema`.
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
    return value; // Not valid JSON: return the original value
  }
};

export const formatValue = value => (value > 0 ? priceFormat(value) : '');

export const formatPhone = phone => {
  if (!phone) return ''; // null/undefined phone returns an empty string

  // The normaliser lives in `@/lib/phone` because the Zod schema validates
  // the phone by the same rule it is displayed with here.
  const cleanPhone = toNationalPhone(phone);

  if (cleanPhone.length > 6) {
    return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(
      3,
      6
    )}-${cleanPhone.slice(6)}`;
  } else if (cleanPhone.length > 3) {
    return `(${cleanPhone.slice(0, 3)}) ${cleanPhone.slice(3)}`;
  } else {
    return cleanPhone; // Under 3 digits, show the digits with no formatting
  }
};
