'use client';

import { getProducts } from '@/services/productService';
import ProductCard from '@/components/products/ProductCard';
import ProductModalHandler from '@/components/products/ProductModalHandler';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ProductGrid() {
  const [products, setProducts] = useState([]);
  const [parent] = useAutoAnimate();
  const [clickedProductId, setClickedProductId] = useState(null);
  const containerRef = useRef(null);
  const searchParams = useSearchParams();
  const q = searchParams.get('q');
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleProductClick = id => {
    setClickedProductId(id);
    document.getElementById(id).showModal();
  };

  const handleClickOutside = event => {
    if (containerRef.current && !containerRef.current.contains(event.target)) {
      setClickedProductId(null);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    if (q) {
      const response = await getProducts(q);
      setProducts(response);
    } else {
      const response = await getProducts();
      setProducts(response);
    }
    setLoading(false);
  }, [q]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <ProductModalHandler>
      {showModal => (
        <div className='' ref={containerRef}>
          <div className='flex flex-col gap-2' ref={parent}>
            {loading ? (
              <div className='flex justify-center'>
                <span className='loading loading-infinity loading-lg bg-primary-orange'></span>
              </div>
            ) : products.length > 0 ? (
              products.map(product => (
                <div
                  className=''
                  key={product._id}
                  onClick={() => {
                    showModal(product)
                    //router.push(`/antojos/${product._id}`);
                  }}
                >
                  <ProductCard product={product} />
                </div>
              ))
            ) : (
              <div className='w-full flex justify-center my-4'>
                <p>No se encontraron productos</p>
              </div>
            )}
          </div>
        </div>
      )}
    </ProductModalHandler>
  );
}
