'use client';

import { getProductById } from '@/services/productService';
import React, { useEffect, useState } from 'react';

export default function HomeProduct({ id }) {
  const [product, setProduct] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      const response = await getProductById(id);
      setProduct(response);
    };
    fetchProduct();
  }, []);
  return (
    <div>
      {product && (
        <div className=''>
          <div className='size-72 w-full'>
            <img
              src={product.thumbnail}
              alt={product.name}
              className='img-full'
            />
          </div>
          <p>{product.name}</p>
        </div>
      )}
      <p>asd</p>
    </div>
  );
}
