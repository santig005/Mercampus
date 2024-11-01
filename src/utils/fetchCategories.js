export const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/categories`);  // Realiza la solicitud a la API
      const data = await res.json();
      return data;  // Retorna las categorías en caso de éxito
    } catch (error) {
      console.error('Network Error:', error);
      return [];  // Retorna un array vacío en caso de error
    }
  };