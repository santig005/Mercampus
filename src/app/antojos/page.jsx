import CategoryGrid from '@/components/CategoryGrid';
import ProductGrid from '@/components/products/ProductGrid';
import ProductGridFavorite from '@/components/products/ProductGridFavorite';
import SearchBox from '@/components/SearchBox';
import { SignOutButton } from '@clerk/nextjs';
import React from 'react';

const Antojos = async () => {
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-4'>
        <h2 className='title !font-normal px-2'>
          Hola Jacobo, <span className='font-semibold'>calma tus antojos</span>
          <SignOutButton redirectUrl='/login' />
        </h2>
        <div className='px-2 sticky top-0 z-10'>
          <SearchBox />
        </div>
        <div className='flex flex-col gap-4'>
          <div className=''>
            <CategoryGrid />
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        <h2 className='title px-2'>Tus favoritos</h2>
        {/* <ProductGrid /> */}
        <ProductGridFavorite />
      </div>
      <div className='flex flex-col gap-2'>
        <h2 className='title sticky top-0 z-10 w-full bg-primary px-2'>
          Todos
        </h2>
        <div className='px-2'>
          <ProductGrid />
        </div>
      </div>
    </div>
  );
};

export default Antojos;
