'use client';

import React, { useEffect, useState } from 'react';
import { categoriesList } from '@/utils/categoriesList';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocalStorage } from '@/utils/hooks/useLocalStorage';

export default function CategoryGrid() {
  const [activeCategory, setActiveCategory] = useLocalStorage(
    'category',
    'Todos'
  );
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const currentCategory = params.get('category');

    if (currentCategory) {
      setActiveCategory(currentCategory);
    } else if (activeCategory && activeCategory !== 'Todos') {
      params.set('category', activeCategory);
      router.replace(`?${params.toString()}`);
    }
  }, []);

  const handleChangeCategory = category => {
    setActiveCategory(category);
    const params = new URLSearchParams(searchParams.toString());

    if (category !== 'Todos') {
      params.set('category', category);
    } else {
      params.delete('category');
    }

    router.push(`?${params.toString()}`);
  };

  return (
    <div className='flex gap-2 overflow-x-auto whitespace-nowrap py-2 hide-scrollbar px-2'>
      {categoriesList.map(category => (
        <button
          key={category.name}
          className={`btn hover:text-primary hover:bg-primary/25 hover:border-primary ${
            category.name === activeCategory ? 'category-active' : 'bg-white'
          } rounded-full`}
          onClick={() => handleChangeCategory(category.name)}
        >
          {category.icon && (
            <div className='size-8'>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={category.icon}
                alt=''
                className='img object-contain w-full h-full pointer-events-none'
              />
            </div>
          )}
          <p className='pointer-events-none select-none'>{category.name}</p>
        </button>
      ))}
    </div>
  );
}
