"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const AddProduct = () => {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    images: '',
    thumbnail: '',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
  
      if (response.ok) {
        router.push('/profile'); // Redirigir a la página de perfil de vendedor
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
      <form onSubmit={handleSubmit}>
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
          <input
            type="text"
            name="category"
            value={formData.category}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Price</label>
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
          <label>Images (comma-separated URLs)</label>
          <input
            type="text"
            name="images"
            value={formData.images}
            onChange={handleChange}
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