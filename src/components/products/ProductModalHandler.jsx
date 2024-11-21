'use client';

import ProductModal from '@/components/products/ProductModal';
import { useState } from 'react';

export default function ProductModalHandler({ children }) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  const showModal = product => {
    setSelectedProduct(product);
    document.getElementById('product_modal').showModal();
  };

  return (
    <>
      {children(showModal)}
      <ProductModal product={selectedProduct} />
    </>
  );
}
