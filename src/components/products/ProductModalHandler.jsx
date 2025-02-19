'use client';

import ProductModal from '@/components/products/ProductModal';
import { useState } from 'react';

export default function ProductModalHandler({ children }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedKey, setSelectedKey] = useState('secondary');

  const showModal = (product, theKey) => {
    setSelectedProduct(product);
    setSelectedKey(() => theKey);
    document.getElementById(`product_modal_${selectedKey}`).showModal();
  };

  return (
    <>
      {children(showModal)}
      <ProductModal
        key={selectedProduct?.id}
        theKey={selectedKey}
        product={selectedProduct}
      />
      {/* <ProductModal
        key={selectedProduct?.id}
        theKey={selectedKey}
        product={selectedProduct}
      /> */}
    </>
  );
}
