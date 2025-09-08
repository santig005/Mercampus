'use client';

import CategoryGrid from '@/components/CategoryGrid';
import ProductGrid from '@/components/products/ProductGrid';
import ProductGridFavorite from '@/components/products/ProductGridFavorite';
import SearchBox from '@/components/SearchBox';
import { SignOutButton, useSession } from '@clerk/nextjs';
import React from 'react';

const Marketplace = () => {
  const { session } = useSession();
  
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-4'>
        {session ? (
          <h2 className='title !font-normal px-2'>
            Hola{' '}
            <span className='text-primary font-bold'>
              {session.publicUserData.firstName}
            </span>
            , <span className='font-semibold'>explora el marketplace</span>
          </h2>
        ) : (
          <h2 className='title !font-normal px-2'>
            Hola, <span className='font-semibold'>explora el marketplace</span>
          </h2>
        )}
        <div className='px-2'>
          <SearchBox />
        </div>
        <div className='flex flex-col gap-4'>
          <div className=''>
            <CategoryGrid section="marketplace" />
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        <h2 className='title w-full bg-primary px-2'>Todos</h2>
        <div className='px-2'>
          <ProductGrid section="marketplace" />
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
