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

// Mantener compatibilidad con código existente
export const categories = antojosCategories;

export const Categories = async () => {
  return antojosCategories;
};

// Función para obtener categorías por sección
export const getCategoriesBySection = async (section) => {
  if (section === 'marketplace') {
    const { marketplaceCategories } = await import('./marketplaceCategories');
    return marketplaceCategories;
  }
  return antojosCategories;
};
