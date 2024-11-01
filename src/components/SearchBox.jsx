'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancelar el timeout si el valor cambia antes de que expire el delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function SearchBox() {
  const [search, setSearch] = useState('');
  const router = useRouter();

  const debouncedSearchValue = useDebounce(search, 500);

  useEffect(() => {
    if (debouncedSearchValue.length >= 2) {
      router.push(`?q=${debouncedSearchValue}`);
    } else {
      router.push('/antojos');
    }
  }, [debouncedSearchValue, router]);
  return (
    <label className='input input-bordered flex items-center gap-2'>
      <input
        type='text'
        className='grow'
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder='Busca tu antojo mas deseado'
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
