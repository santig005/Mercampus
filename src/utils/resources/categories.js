export const antojosCategories = [
  'Dulces',
  'Frutas',
  'Frituras',
  'Galletas',
  'Helados',
  'Panadería',
  'Repostería',
  'Snacks', 
  'Comida rápida',
  'Otros'
];

// Kept for compatibility with existing code
export const categories = antojosCategories;

export const Categories = async () => {
  return antojosCategories;
};

// Returns the categories for a given section
export const getCategoriesBySection = async (section) => {
  if (section === 'marketplace') {
    const { marketplaceCategories } = await import('./marketplaceCategories');
    return marketplaceCategories;
  }
  return antojosCategories;
};
