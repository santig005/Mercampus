/**
 * Reduces a price, as a seller types it, to whole Colombian pesos.
 *
 * The product forms take the price in a free-text input, so it reaches the
 * API as a string - "5000", but just as often "5.000" or "$ 5.000", because in
 * Colombia the dot is the thousands separator. `Number()` or
 * `z.coerce.number()` would read "5.000" as five and store a price a thousand
 * times too low without anyone noticing. Every price already in the database
 * is a whole number of pesos (112 products, 1.212 to 1.100.000, measured
 * 2026-09-13), so there are no cents to preserve either.
 *
 * Accepted: a number (passed through untouched - the schema still decides
 * whether it is a valid price), plain digits, or digits grouped in threes by
 * one kind of separator, dots or commas, optionally with `$`, `COP` and
 * spaces around them.
 *
 * Everything else is NaN, which the schema rejects with a message naming the
 * field. That includes "5,5" and "5.50": a separator not followed by exactly
 * three digits could be a decimal or a typo, and guessing is how a wrong price
 * gets stored silently. Same for "1.000,50", which mixes both conventions.
 */
export const toPesos = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return Number.NaN;

  const cleaned = value.replace(/cop/gi, '').replace(/[$\s ]/g, '');

  if (/^\d+$/.test(cleaned)) return Number(cleaned);

  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned) || /^\d{1,3}(,\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/[.,]/g, ''));
  }

  return Number.NaN;
};
