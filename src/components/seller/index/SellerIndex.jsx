import React from 'react';
import SellerModal from '@/components/seller/index/SellerModal';
import SellerGrid from '@/components/seller/index/SellerGrid'; // Añado el Grid aquí para ejemplo

export default function SellerIndex({ sellers }) {
  return (
    <div className='flex flex-col gap-4'>
      {/* Puedes usar el Grid si prefieres organizar los vendedores de esta forma */}
      <SellerGrid sellers={sellers} />
    </div>
  );
}
