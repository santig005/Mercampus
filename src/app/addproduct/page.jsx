"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCategories } from '@/utils/fetchCategories';

const AddProduct = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    price: '',
    description: '',
    images: [],
    thumbnail: '',
  });

  const [categories, setCategories] = useState([]);  // Estado para almacenar las categorías

  useEffect(() => {
    // Llamar a la función fetchCategories del archivo de servicio
    const loadCategories = async () => {
      const categoriesData = await fetchCategories();  // Espera el resultado
      setCategories(categoriesData);  // Actualiza el estado con las categorías obtenidas
    };

    loadCategories();  // Llama a la función cuando el componente se monta
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append('name', formData.name);
    data.append('categoryId', formData.categoryId);
    data.append('price', formData.price);
    data.append('description', formData.description);
    data.append('thumbnail', formData.thumbnail);

    formData.images.forEach((file) => {
      data.append('images', file);
    });

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        body: data,
      });

      if (response.ok) {
        router.push('/sellerprofile');  // Redirigir al perfil del vendedor
      } else {
        const errorData = await response.json();
        console.error('Error:', errorData.message);
      }
    } catch (error) {
      console.error('Network Error:', error);
    }
  };

  return (
    <div>
      <h1>Add Product Form</h1>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div>
          <label>Product Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Category</label>
          <select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            required
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Price $</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Images</label>
          <input
            type="file"
            name="images"
            multiple
            onChange={(e) =>
              setFormData({ ...formData, images: [...e.target.files] })
            }
            required
          />
        </div>
        <div>
          <label>Thumbnail</label>
          <input
            type="text"
            name="thumbnail"
            value={formData.thumbnail}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default AddProduct;
