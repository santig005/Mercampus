'use client';
import { getSellers } from '@/services/sellerService';
import React, { useEffect, useState } from 'react';
import SellerCard from '@/components/seller/index/SellerCard';
import SellerModalHandler from '@/components/seller/index/SellerModalHandler';
import { useSeller } from '@/context/SellerContext';
import ToggleSwitch from '@/components/availability/ToggleSwitch';
import { updateSeller } from '@/services/sellerService';
import { useUniversity } from '@/context/UniversityContext';
import SellerCardAV from '@/components/seller/index/SellerCardAV';
import { useAuth } from '@clerk/nextjs';

export default function SellerGrid({ section = 'antojos' }) {
  const [sellers, setSellers] = useState([]);
  const {dbUser} = useSeller();
  const {university} = useUniversity();
  const { getToken } = useAuth();

  useEffect(() => {
    async function fetchSellers() {
      try {
        const data = await getSellers(university, section);
        setSellers(data.sellers);
      } catch (error) {
        console.error('Error fetching sellers:', error);
        setSellers([]);
      }
    }

    fetchSellers();
  }, [university, section]);

  const handleSellerApproval = async (isOn, sellerId) => {
    try {
      //here we update the seller approval status
      setSellers(prevSellers =>
        prevSellers.map(seller =>
          seller._id === sellerId ? { ...seller, approved: !isOn } : seller
        )
      );
      const token = await getToken({ skipCache: true});
      const response = await updateSeller(sellerId, { approved: !isOn },token);
      if (response.error) {
        setSellers(prevSellers =>
          prevSellers.map(seller =>
            seller._id === sellerId ? { ...seller, approved: isOn } : seller
          )
        );
      }
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
          {visibleSellers.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <div className='text-gray-400 mb-4'>
                <svg className='w-16 h-16 mx-auto' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
                </svg>
              </div>
              <h3 className='text-lg font-semibold text-gray-600 mb-2'>
                No hay vendedores disponibles
              </h3>
              <p className='text-gray-500 max-w-md'>
                {section === 'marketplace' 
                  ? 'No hay vendedores registrados en el marketplace para tu universidad en este momento.'
                  : 'No hay vendedores registrados en antojos para tu universidad en este momento.'
                }
              </p>
            </div>
          ) : (
            <>
              {dbUser?.role === 'admin' ? (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                  {sellers.map(seller => (
                    <div key={seller._id} className='bg-white shadow-md rounded-lg'>
                      <div className='w-full' onClick={() => showModal(seller)}>
                        <SellerCardAV seller={seller} />
                      </div>
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
            </>
          )}
        </div>
      )}
    </SellerModalHandler>
  );
}
