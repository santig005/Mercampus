// Regex insensible a acentos para el buscador de productos (T-24).
//
// Medido contra la base real: 6% de los nombres de producto llevan tilde o
// eñe, y el $regex sin normalizar no los encontraba si el usuario escribia
// sin acento -- el caso comun al escribir rapido en el celular.
//
// No se uso un indice de texto de Mongo ($text): el buscador hace busqueda
// en vivo desde 2 caracteres (SearchBox.jsx, debounce de 500ms), y $text
// no hace match por prefijo -- probado contra datos reales, "bro" no
// encuentra "Brownie de chocolate" hasta escribir casi la palabra completa
// ("browni"). Eso habria roto la busqueda mientras se escribe. Este regex
// conserva el mismo comportamiento de substring/prefijo que ya existia,
// solo le suma tolerancia a acentos -- no corrige singular/plural, pero en
// un buscador que ya busca por cada tecla, ese caso se mitiga solo: al
// llegar a escribir "arepas" ya se paso por "arepa" (singular) en un
// tecleo anterior.

const ACCENT_VARIANTS: Record<string, string> = {
  a: 'áàäâã',
  e: 'éèëê',
  i: 'íìïî',
  o: 'óòöôõ',
  u: 'úùüû',
  n: 'ñ',
};

// Rango Unicode "Combining Diacritical Marks" (U+0300 a U+036F): lo que
// separa NFD al descomponer una letra acentuada en letra base + marca de
// acento. Construido con RegExp(string) en vez de un literal /.../ para que
// el escape quede como texto legible en el archivo, no como el caracter de
// combinacion en si.
const COMBINING_DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/;

/**
 * Convierte un termino de busqueda en un RegExp que matchea sin importar
 * tildes/eñe, sin importar de que lado esten: si el usuario escribe con o
 * sin acento, y si el nombre guardado lo tiene o no.
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
