'use client';

import SellerModal from '@/components/seller/index/SellerModal';
import { useState } from 'react';

export default function SellerModalHandler({ children }) {
  const [selectedSeller, setSelectedSeller] = useState(null);

  const showModal = seller => {
    setSelectedSeller(seller);
    document.getElementById('seller_modal').showModal();
  };

  return (
    <>
      {children(showModal)}
      <SellerModal seller={selectedSeller} set={setSelectedSeller} />
    </>
  );
}
