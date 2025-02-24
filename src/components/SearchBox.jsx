'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function SearchBox() {
  const [search, setSearch] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const category = searchParams.get('category') || '';
  const sellerId = searchParams.get('sellerId') || '';

  const debouncedSearchValue = useDebounce(search, 500);

  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedSearchValue.length >= 2) {
      params.set('product', debouncedSearchValue);
    }

    if (category) {
      params.set('category', category);
    }

    if (sellerId) {
      params.set('sellerId', sellerId);
    }

    router.push(`?${params.toString()}`);
  }, [debouncedSearchValue, category, sellerId, router]);

  return (
    <label className='input input-bordered flex items-center gap-2'>
      <input
        type='text'
        className='grow'
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder='Busca tu antojo más deseado'
      />
      <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 16 16'
        fill='currentColor'
        className='h-4 w-4 opacity-70'
      >
        <path
          fillRule='evenodd'
          d='M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z'
          clipRule='evenodd'
        />
      </svg>
    </label>
  );
}
