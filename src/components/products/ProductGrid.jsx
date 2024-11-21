'use client';

import ProductCard from '@/components/products/ProductCard';
import { getItems } from '@/utils/fetchData';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useSearchParams } from 'next/navigation';
import ProductModalHandler from '@/components/products/ProductModalHandler';

export default function ProductGrid() {
  const [products, setProducts] = useState([]);
  const [parent] = useAutoAnimate();
  const [clickedProductId, setClickedProductId] = useState(null);
  const containerRef = useRef(null);
  const searchParams = useSearchParams();
  const q = searchParams.get('q');

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
    if (q) {
      const response = await getItems(q);
      setProducts(response);
    } else {
      const response = await getItems();
      setProducts(response);
    }
  }, [q]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <ProductModalHandler>
      {showModal => (
        <div className='' ref={containerRef}>
          <div className='flex flex-col gap-2' ref={parent}>
            {products.map(product => (
              <div
                className=''
                key={product._id}
                onClick={() => showModal(product)}
              >
                <ProductCard
                  product={product}
                  // isClicked={clickedProductId === product._id}
                />
              </div>
            ))}
          </div>

          {/* Modal */}
        </div>
      )}
    </ProductModalHandler>
  );
}
