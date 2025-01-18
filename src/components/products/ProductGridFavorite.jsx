'use client';

import ProductCardFavorite from '@/components/products/ProductCardFavorite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useSearchParams } from 'next/navigation';

export default function ProductGridFavorite() {
  const [products, setProducts] = useState([]);
  const [parent] = useAutoAnimate();
  const [clickedProductId, setClickedProductId] = useState(null);
  const containerRef = useRef(null);
  const searchParams = useSearchParams();
  const q = searchParams.get('q');

  const handleProductClick = id => {
    setClickedProductId(id);
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
    <div className='' ref={containerRef}>
      <div
        className='flex gap-2 overflow-x-auto whitespace-nowrap p-1 pb-3 px-2 grow hide-scrollbar'
        ref={parent}
      >
        {products.map(product => (
          <ProductCardFavorite
            key={product._id}
            product={product}
            isClicked={clickedProductId === product._id}
            onClick={() => handleProductClick(product._id)}
          />
        ))}
      </div>
    </div>
  );
}
