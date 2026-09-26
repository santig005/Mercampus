'use client';

import CategoryGrid from '@/components/CategoryGrid';
import ProductGrid from '@/components/products/ProductGrid';
import SearchBox from '@/components/SearchBox';
import { useSession } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import React from 'react';

// T-81: moved from src/app/marketplace/page.jsx (deleted) as part of the
// i18n listing zone migration. /marketplace/[id] is untouched - see
// src/app/[locale]/marketplace/layout.jsx.
//
// ProductGridFavorite and SignOutButton were imported here in the original
// file but never rendered - dropped rather than carried over (see the same
// note in src/app/[locale]/antojos/page.jsx).
const Marketplace = () => {
  const { session } = useSession();
  const firstName = session?.publicUserData?.firstName;
  const t = useTranslations('Marketplace');

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-4'>
        {/* T-88 (audit finding F22): signed out this read "Hola, explora el marketplace" -
            the comma was there for a name that never arrives. The greeting
            only exists when there is somebody to greet, and a Clerk account
            with no first name falls into the same branch as a visitor rather
            than rendering "Hola , ...". */}
        {firstName ? (
          <h2 className='title !font-normal px-2'>
            {t('greetingHi')}{' '}
            <span className='text-primary font-bold'>{firstName}</span>
            , <span className='font-semibold'>{t('greetingTailWithName')}</span>
          </h2>
        ) : (
          <h2 className='title !font-normal px-2'>
            <span className='font-semibold'>{t('greetingTailNoName')}</span>
          </h2>
        )}
        <div className='px-2'>
          <SearchBox section="marketplace" />
        </div>
        <div className='flex flex-col gap-4'>
          <div className=''>
            <CategoryGrid section="marketplace" />
          </div>
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        {/* T-73: dark:bg-base-100 - ver la nota en Layout.jsx sobre
            bg-primary (rinde blanco fijo via override en main.css). */}
        <h2 className='title w-full bg-primary dark:bg-base-100 px-2'>{t('allHeading')}</h2>
        <div className='px-2'>
          <ProductGrid section="marketplace" />
        </div>
      </div>
    </div>
  );
};

export default Marketplace;
