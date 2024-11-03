'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { categories as categos } from '@/utils/fetchCategories';

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

  const [categories, setCategories] = useState([]);  // State for storing categories

  useEffect(() => {
    // Fetch categories when component mounts
    const loadCategories =  () => {
      const categoriesData = categos;  // Await the result
      setCategories(categoriesData);  // Update state with fetched categories
    };

    loadCategories();  // Call the function on component mount
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

    // Image uploading
    let uploadedImages = [];
    try {
      if (formData.images.length > 0) {
        uploadedImages = await Promise.all(
          formData.images.map(async (file) => {
            const imageFormData = new FormData();
            imageFormData.append('file', file);
            imageFormData.append('folder', 'products');
            const response = await fetch('/api/uploadimageProduct', {
              method: 'POST',
              body: imageFormData,  // Send the file to the API
            });

            if (!response.ok) {
              throw new Error('Error uploading image');
            }
            const data = await response.json();
            return data.url;  // Assuming your API returns the URL
          })
        );
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('There was a problem uploading the images. Please try again.');
      return;
    }

    // Prepare product data
    const data = {
      name: formData.name,
      category: formData.categoryId,
      price: formData.price,
      description: formData.description,
      images: uploadedImages,  // Save uploaded image URLs
      thumbnail: uploadedImages[0], // This can also be one of the uploaded images
    };

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',  // Set content type to JSON
        },
        body: JSON.stringify(data),  // Convert data object to JSON string
      });

      if (response.ok) {
        router.push('/');  // Redirect to seller profile
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
      <h1>Agrega aquí tu producto</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nombre</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Categoría</label>
          <select
            name="categoryId"
            value={formData.categoryId}
            onChange={handleChange}
            required
          >
            <option value="">Selecciona</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Precio $</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Descripción</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
          />
        </div>
        <div>
          <label>Imágenes</label>
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
        <button type="submit">Subir Producto</button>
      </form>
    </div>
  );
};

export default AddProduct;