// Accent-insensitive regex for the product search (T-24).
//
// Measured against the real database: 6% of product names carry an accent or
// an n-tilde, and the un-normalised $regex did not find them if the user
// typed without the accent -- the common case when typing fast on a phone.
//
// A Mongo text index ($text) was not used: the search runs live from 2
// characters (SearchBox.jsx, 500ms debounce), and $text does not match by
// prefix -- tested against real data, "bro" does not find "Brownie de
// chocolate" until almost the whole word is typed ("browni"). That would
// have broken search-as-you-type. This regex keeps the substring/prefix
// behaviour that already existed and only adds accent tolerance -- it does
// not handle singular/plural, but in a search that fires on every keystroke
// that case takes care of itself: by the time you have typed "arepas" you
// already went through "arepa" (singular) on an earlier keystroke.

const ACCENT_VARIANTS: Record<string, string> = {
  a: 'áàäâã',
  e: 'éèëê',
  i: 'íìïî',
  o: 'óòöôõ',
  u: 'úùüû',
  n: 'ñ',
};

// The Unicode "Combining Diacritical Marks" range (U+0300 to U+036F): what
// NFD splits off when it decomposes an accented letter into base letter +
// accent mark. Built with RegExp(string) rather than a /.../ literal so the
// escape stays readable text in the file, instead of the combining character
// itself.
const COMBINING_DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/;

/**
 * Turns a search term into a RegExp that matches regardless of accents or
 * n-tilde, on either side: whether the user typed them or not, and whether
 * the stored name has them or not.
 */
export function buildAccentInsensitiveRegex(term: string): RegExp {
  const base = term
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS, '') // quita los diacriticos, deja la letra base
    .toLowerCase();

  const pattern = Array.from(base)
    .map(char => {
      const variants = ACCENT_VARIANTS[char];
      if (variants) return `[${char}${variants}]`;
      return REGEX_SPECIAL_CHARS.test(char) ? `\\${char}` : char;
    })
    .join('');

  return new RegExp(pattern, 'i');
}
