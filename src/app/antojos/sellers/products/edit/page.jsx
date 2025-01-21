'use client';
import React, { useEffect, useState } from 'react';
import { getSellerProducts,updateProduct } from '@/services/productService';
import ProductCard from '@/components/products/ProductCard';
import { useRouter } from 'next/navigation';
import ToggleSwitch from '@/components/availability/ToggleSwitch';

export default function EditProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchSellerProducts() {
      try {
        const currentSellerId="67494329273a1f9b5c67f5f1";
        const response = await getSellerProducts(currentSellerId);
        setProducts(response.products);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSellerProducts();
  }, []);

  const handleProductClick = (id) => {
    router.push(`/antojos/products/edit/${id}`);
  };
  const handleAvailabilityToggle = async (id, currentAvailability) => {
    try {
      const updatedProduct = await updateProduct(id, { availability: !currentAvailability });
      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product._id === id ? { ...product, availability: updatedProduct.availability } : product
        )
      );
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  if (loading) return <p>Cargando productos...</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Editar tus Productos</h1>
      <h2>Edita la disponibilidad de tus productos, o da click en uno en especifico para editar mas detalles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products?.map((product) => (
          <div
          key={product._id}
          className="flex justify-between items-center gap-4 p-2 bg-white rounded shadow-md"
        >
          <div onClick={() => handleProductClick(product._id)}>
            <ProductCard product={product} isClicked={false} />
          </div>
          <ToggleSwitch
            isOn={product.availability}
            onToggle={() => handleAvailabilityToggle(product._id, product.availability)}
          />
        </div>
        ))}
      </div>
    </div>
  );
}
