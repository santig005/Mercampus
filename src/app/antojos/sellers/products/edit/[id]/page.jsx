"use client";
import React, { useEffect, useState } from 'react';
import { getProductById, updateProduct } from '@/services/productService';
import { useRouter } from 'next/navigation';

export default function EditProductPage({ params }) {
  const { id } = params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await getProductById(id);
        setProduct(response.product);
      } catch (error) {
        setError('Error fetching product details.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProduct(id, product);
      router.push('/antojos/sellers/editproducts'); // Redirige al listado tras la edición
    } catch (error) {
      setError('Error updating product.');
      console.error(error);
    }
  };

  if (loading) return <p>Cargando producto...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Editar Producto</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Nombre del Producto</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={product.name}
            onChange={(e) => setProduct({ ...product, name: e.target.value })}
          />
        </div>
        <div>
          <label className="block font-medium">Precio</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={product.price}
            onChange={(e) => setProduct({ ...product, price: parseFloat(e.target.value) })}
          />
        </div>
        <div>
          <label className="block font-medium">Disponibilidad</label>
          <select
            className="w-full p-2 border rounded"
            value={product.availability}
            onChange={(e) => setProduct({ ...product, availability: e.target.value })}
          >
            <option value="available">Disponible</option>
            <option value="unavailable">No disponible</option>
          </select>
        </div>
        <div>
          <label className="block font-medium">Categoría</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={product.category}
            onChange={(e) => setProduct({ ...product, category: e.target.value })}
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Guardar Cambios
        </button>
      </form>
    </div>
  );
}
