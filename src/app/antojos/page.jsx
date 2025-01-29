'use client';

import CategoryGrid from '@/components/CategoryGrid';
import ProductGrid from '@/components/products/ProductGrid';
import ProductGridFavorite from '@/components/products/ProductGridFavorite';
import SearchBox from '@/components/SearchBox';
import { SignOutButton, useSession } from '@clerk/nextjs';
import React from 'react';

const Antojos = () => {
  const { session } = useSession();
  // console.log(session);
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-4'>
        {session ? (
          <h2 className='title !font-normal px-2'>
            Hola {session.publicUserData.firstName},{' '}
            <span className='font-semibold'>calma tus antojos</span>
          </h2>
        ) : (
          <h2 className='title !font-normal px-2'>
            Hola, <span className='font-semibold'>calma tus antojos</span>
          </h2>
        )}
        <div className='px-2'>
          <SearchBox />
        </div>
        <div className='flex flex-col gap-4'>
          <div className=''>
            <CategoryGrid />
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        <h2 className='title w-full bg-primary px-2'>Todos</h2>
        <div className='px-2'>
          <ProductGrid />
        </div>
      </div>
    </div>
  );
};

export default Antojos;
