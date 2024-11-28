import React, { useEffect, useState } from 'react';
import SellerCard from '@/components/seller/index/SellerCard';
import SellerModalHandler from '@/components/seller/index/SellerModalHandler';

export default function SellerGrid() {
  const [sellers, setSellers] = useState([]);

  useEffect(() => {
    async function fetchSellers() {
      try {
        const response = await fetch('/api/sellers/index2');
        const data = await response.json();
        setSellers(data.sellers);
      } catch (error) {
        console.error('Error fetching sellers:', error);
      }
    }

    fetchSellers();
  }, []);

  return (
    <SellerModalHandler>
      {showModal => (
        <div className='flex flex-col gap-2'>
          {sellers &&
            sellers.map(seller => (
              <div key={seller._id} onClick={() => showModal(seller)}>
                <SellerCard seller={seller} />
              </div>
            ))}
        </div>
      )}
    </SellerModalHandler>
  );
}
