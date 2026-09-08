'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

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

// T-88 (audit finding F21): the placeholder used to be hardcoded to the
// antojos copy, so /marketplace asked for "tu antojo mas deseado" too. The
// `section` prop is the same one CategoryGrid and ProductGrid already take,
// so the three components on these pages are configured the same way.
const PLACEHOLDERS = {
  antojos: 'Busca tu antojo más deseado',
  marketplace: 'Busca en el marketplace',
};

export default function SearchBox({ section = 'antojos' }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // T-92 (audit finding F3): seeded from the URL, not from an empty string.
  // ProductGrid reads `product` off the query string one line later, so a
  // shared or reloaded /antojos?product=arepa has to arrive with the box
  // already holding "arepa" - otherwise the box and the listing disagree
  // about what is being searched.
  const [search, setSearch] = useState(() => searchParams.get('product') ?? '');
  const category = searchParams.get('category') || '';
  const sellerId = searchParams.get('sellerId') || '';

  const debouncedSearchValue = useDebounce(search, 500);

  // The other half of F3. This effect rebuilds the query string from the
  // component's own state, and on mount that state has not been typed by
  // anyone - so it used to push a URL with no `product` at all, wiping the
  // param it had just been handed. The search box wrote a URL the app could
  // not read back: shared links and reloads both came back unfiltered.
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

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
        placeholder={PLACEHOLDERS[section] ?? PLACEHOLDERS.antojos}
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
