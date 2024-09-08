import CategoryGrid from '@/components/CategoryGrid';
import ProductGrid from '@/components/products/ProductGrid';
import ProductGridFavorite from '@/components/products/ProductGridFavorite';
import SearchBox from '@/components/SearchBox';
import React from 'react';

export default function Antojos() {
  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-4'>
        <h2 className='title !font-normal'>
          Hola Jacobo, <span className='font-semibold'>calma tus antojos</span>
        </h2>
        <div className='flex flex-col gap-4'>
          <SearchBox />
          <CategoryGrid />
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        <h2 className='title'>Tus favoritos</h2>
        {/* <ProductGrid /> */}
        <ProductGridFavorite />
      </div>
      <div className='flex flex-col gap-2'>
        <h2 className='title'>Todos</h2>
        <ProductGrid />
      </div>
    </div>
  );
}
