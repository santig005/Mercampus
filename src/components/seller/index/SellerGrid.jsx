'use client';
import { logger } from '@/lib/logger';
import { getSellers } from '@/services/sellerService';
import React, { useEffect, useState } from 'react';
import SellerCard from '@/components/seller/index/SellerCard';
import SellerModalHandler from '@/components/seller/index/SellerModalHandler';
import { useUniversity } from '@/context/UniversityContext';

// The public seller listing. Nothing more.
//
// T-106: this used to be two components in one. An admin got a second layout
// with an approve/reject toggle per card, and everybody else got the same list
// with the unapproved sellers filtered out in the browser. Both are gone:
//
//  - The approval UI lives only at /admin/sellers now. That panel already had
//    the same toggle, reads GET /api/sellers/admin (gated by the middleware's
//    /api/(.*)/admin(.*) matcher) and shows registration date and status, which
//    this grid never did. There was no reason for a second, worse copy of it.
//  - The `approved` filter moved into the Mongo query in GET /api/sellers. It
//    was the client-side filter here that forced that endpoint - public and
//    unauthenticated - to ship the whole pending queue to every visitor so that
//    an admin's copy of this page could filter it back in. A render decision
//    was standing in for an authorisation boundary.
//
// So there is no `isAdmin` branch left, and no reason for this component to
// know who is looking: the server already decided what it may see.
export default function SellerGrid({ section = 'antojos' }) {
  const [sellers, setSellers] = useState([]);
  const { university } = useUniversity();

  useEffect(() => {
    async function fetchSellers() {
      try {
        const data = await getSellers(university, section);
        setSellers(data.sellers);
      } catch (error) {
        logger.error('Error fetching sellers:', error);
        setSellers([]);
      }
    }

    fetchSellers();
  }, [university, section]);

  return (
    <SellerModalHandler>
      {showModal => (
        <div className='flex flex-col gap-4'>
          {sellers.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <div className='text-gray-400 dark:text-base-content/70 mb-4'>
                <svg className='w-16 h-16 mx-auto' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
                </svg>
              </div>
              <h3 className='text-lg font-semibold text-gray-600 dark:text-base-content/70 mb-2'>
                No hay vendedores disponibles
              </h3>
              <p className='text-gray-500 dark:text-base-content/70 max-w-md'>
                {section === 'marketplace'
                  ? 'No hay vendedores registrados en el marketplace para tu universidad en este momento.'
                  : 'No hay vendedores registrados en antojos para tu universidad en este momento.'
                }
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {sellers.map(seller => (
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
