'use client';

import React, { useState } from 'react';
import { categoriesList } from '@/utils/categoriesList';

export default function CategoryGrid() {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const handleChangeCategory = category => {
    setActiveCategory(category);
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
