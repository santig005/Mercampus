// Category values ("Dulces", "Comida rápida", ...) are the taxonomy the whole
// app agrees on: they are stored on every product, validated by Zod and the
// Mongoose schema, sent to the API as `?category=`, and remembered in
// localStorage by CategoryGrid. They stay Spanish and never change.
//
// Only what a person reads is translated. This maps each stored value to a
// key in the `Categories` namespace of messages/{es,en}.json. Accents and
// spaces are fine inside a stored value but awkward as message keys, hence
// the explicit ASCII keys instead of using the value itself.
const CATEGORY_MESSAGE_KEYS: Record<string, string> = {
  // The "all categories" chip. Not a stored value, only a UI option.
  Todos: 'all',
  // antojos (src/utils/resources/categories.js)
  Dulces: 'sweets',
  Frutas: 'fruits',
  Frituras: 'fried',
  Galletas: 'cookies',
  Helados: 'iceCream',
  Panadería: 'bakery',
  Repostería: 'pastries',
  Snacks: 'snacks',
  'Comida rápida': 'fastFood',
  // Shared by both sections.
  Otros: 'other',
  // marketplace (src/utils/resources/marketplaceCategories.js)
  Accesorios: 'accessories',
  Maquillaje: 'makeup',
  Termos: 'thermoses',
  Ropa: 'clothing',
  Tecnología: 'technology',
  Libros: 'books',
  Deportes: 'sports',
  Hogar: 'home',
  Belleza: 'beauty',
};

// null for a value with no key - a product saved under a category that was
// later renamed or dropped. Callers show that value as it is stored rather
// than a missing-message placeholder.
export function categoryMessageKey(value: string): string | null {
  return Object.hasOwn(CATEGORY_MESSAGE_KEYS, value) ? CATEGORY_MESSAGE_KEYS[value] : null;
}
