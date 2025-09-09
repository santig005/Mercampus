'use client';
import React, { useEffect, useState } from 'react';
import { getSellerProducts } from '@/services/productService';
import ProductCard from '@/components/products/ProductCard';
import ProductModalHandler from '@/components/products/ProductModalHandler';

export default function SellerProductsBySection({ sellerId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        // Obtener todos los productos del vendedor (sin filtro de sección)
        const response = await getSellerProducts(sellerId);
        setProducts(response.products || []);
      } catch (error) {
        console.error('Error fetching seller products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    if (sellerId) {
      fetchProducts();
    }
  }, [sellerId]);

  if (loading) {
    return (
      <div className='flex justify-center items-center py-8'>
        <span className='loading loading-spinner loading-md'></span>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className='text-center py-8 text-gray-500'>
        <p>Este vendedor aún no tiene productos disponibles.</p>
      </div>
    );
  }

  // Agrupar productos por sección
  const productsBySection = products.reduce((acc, product) => {
    const section = product.section || 'antojos';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(product);
    return acc;
  }, {});

  // Ordenar secciones para que antojos vaya primero
  const sortedSections = Object.entries(productsBySection).sort(([a], [b]) => {
    if (a === 'antojos') return -1;
    if (b === 'antojos') return 1;
    return a.localeCompare(b);
  });

  return (
    <ProductModalHandler>
      {showModal => (
        <div className='space-y-6'>
          {sortedSections.map(([section, sectionProducts]) => (
            <div key={section}>
              <h3 className='text-lg font-bold mb-3 text-gray-800 px-6'>
                {section === 'antojos' ? (
                  <>🍕 Antojos ({sectionProducts.length} productos)</>
                ) : (
                  <>🛍️ Marketplace ({sectionProducts.length} productos)</>
                )}
              </h3>
              <div className='space-y-3 px-2'>
                {sectionProducts.map(product => (
                  <div
                    key={product._id}
                    className='w-full'
                    onClick={() => showModal(product, 'secondary')}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ProductModalHandler>
  );
}
