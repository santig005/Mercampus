'use client';

import { getProducts } from '@/services/productService';
import ProductCard from '@/components/products/ProductCard';
import ProductModalHandler from '@/components/products/ProductModalHandler';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useSearchParams } from 'next/navigation';
import { useUniversity } from '@/context/UniversityContext';

export default function ProductGrid({ sellerIdParam = '' }) {
  const [products, setProducts] = useState([]);
  const [parent] = useAutoAnimate();
  const containerRef = useRef(null);
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const { university } = useUniversity();

  // Extraemos los filtros desde la URL
  const product = searchParams.get('product') || '';
  const category = searchParams.get('category') || '';
  const sellerId = searchParams.get('sellerId') || sellerIdParam;


  const loadProducts = useCallback(async () => {
    setLoading(true);
    const { products } = await getProducts(product, category, sellerId,university);
    setProducts(products);
    setLoading(false);
  }, [product, category, sellerId,university]);

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
            ) : products?.length > 0 ? (
              products?.map(product => (
                <div
                  className=''
                  key={product._id}
                  onClick={() => {
                    if (sellerId) {
                      // document.getElementById('product_modal_main').close();
                      document
                        .getElementById('product_modal_secondary')
                        .close();
                      showModal(product, 'secondary');
                      // document.getElementById('seller_modal').close();
                    } else {
                      showModal(product, 'main');
                    }
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
