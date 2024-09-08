'use client';

import { getItems } from '@/utils/fetchData';
import React, { useEffect, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import ProductCardFavorite from '@/components/products/ProductCardFavorite';

export default function ProductGridFavorite() {
  const [products, setProducts] = useState([]);
  const [parent] = useAutoAnimate();

  useEffect(() => {
    const fetchProducts = async () => {
      const response = await getItems();
      setProducts(response);
    };
    fetchProducts();
  }, []);

  return (
    <div
      className='flex gap-2 overflow-x-auto whitespace-nowrap pb-2 px-2'
      ref={parent}
    >
      {products.map(product => (
        <ProductCardFavorite key={product._id} product={product} />
      ))}
    </div>
  );
}
