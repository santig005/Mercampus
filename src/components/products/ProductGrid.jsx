'use client';

import ProductCard from '@/components/products/ProductCard';
import { getItems } from '@/utils/fetchData';
import React, { useEffect, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';

export default function ProductGrid() {
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
    <div className='flex flex-col gap-2' ref={parent}>
      {products.map(product => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
