export const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/categories`);  // Realiza la solicitud a la API
      console.log("antes de json")
      console.log(res)
      const data = await res.json();
      console.log(data)
      return data;  // Retorna las categorías en caso de éxito
    } catch (error) {
      console.error('Network Error:', error);
      return [];  // Retorna un array vacío en caso de error
    }
  };