'use client';

import ProductCard from '@/components/products/ProductCard';
import { getItems } from '@/utils/fetchData';
import React, { useEffect, useState, useRef } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import ProductModal from '@/components/products/ProductModal';

export default function ProductGrid() {
  const [products, setProducts] = useState([]);
  const [parent] = useAutoAnimate();
  const [clickedProductId, setClickedProductId] = useState(null);
  const containerRef = useRef(null);

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

  useEffect(() => {
    const fetchProducts = async () => {
      const response = await getItems();
      setProducts(response);
    };
    fetchProducts();
  }, []);

  return (
    <div className='' ref={containerRef}>
      <div className='flex flex-col gap-2' ref={parent}>
        {products.map(product => (
          <div className='' key={product._id}>
            <ProductCard
              product={product}
              isClicked={clickedProductId === product._id}
              onClick={() => handleProductClick(product._id)}
            />
            <ProductModal product={product} />
          </div>
        ))}
      </div>

      {/* Modal */}
    </div>
  );
}
