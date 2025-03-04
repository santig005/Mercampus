'use client';
import { getSellers } from '@/services/sellerService';
import React, { useEffect, useState } from 'react';
import SellerCard from '@/components/seller/index/SellerCard';
import SellerModalHandler from '@/components/seller/index/SellerModalHandler';
import { useSeller } from '@/context/SellerContext';
import ToggleSwitch from '@/components/availability/ToggleSwitch';
import { updateSeller } from '@/services/sellerService';
import SellerCardAV from '@/components/seller/index/SellerCardAV';

export default function SellerGrid() {
  const [sellers, setSellers] = useState([]);
  const { dbUser } = useSeller();

  useEffect(() => {
    async function fetchSellers() {
      try {
        const data = await getSellers();
        setSellers(data.sellers);
      } catch (error) {
        console.error('Error fetching sellers:', error);
      }
    }

    fetchSellers();
  }, []);

  const handleSellerApproval = async (isOn, sellerId) => {
    try {
      //here we update the seller approval status
      setSellers(prevSellers =>
        prevSellers.map(seller =>
          seller._id === sellerId ? { ...seller, approved: !isOn } : seller
        )
      );
      const response = await updateSeller(sellerId, { approved: !isOn });
      if (response.error) {
        setSellers(prevSellers =>
          prevSellers.map(seller =>
            seller._id === sellerId ? { ...seller, approved: isOn } : seller
          )
        );
      }
      console.log(response);
    } catch (error) {
      console.error('Error updating seller:', error);
    }
  };

  const visibleSellers =
    dbUser?.role === 'admin'
      ? sellers
      : sellers.filter(seller => seller.approved);

  return (
    <SellerModalHandler>
      {showModal => (
        <div className='flex flex-col gap-4'>
          {dbUser?.role === 'admin' ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {sellers.map(seller => (
                <div key={seller._id} className='bg-white shadow-md rounded-lg'>
                  <div className='w-full' onClick={() => showModal(seller)}>
                    <SellerCardAV seller={seller} />
                    <div className='flex justify-between p-2 w-full'>
                      <p>Activo:</p>
                      <ToggleSwitch
                        isOn={seller.approved || false}
                        onToggle={() =>
                          handleSellerApproval(seller.approved, seller._id)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Diseño para usuarios normales (solo aprobados)
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {visibleSellers.map(seller => (
                <div
                  key={seller._id}
                  onClick={() => showModal(seller)}
                  className='cursor-pointer'
                >
                  <SellerCard seller={seller} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </SellerModalHandler>
  );
}
