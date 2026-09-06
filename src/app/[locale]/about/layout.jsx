import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import LocaleSwitcher from '@/components/general/LocaleSwitcher';

export default async function layout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('AboutLayout');

  return (
    <div className='w-full'>
      {/* Topbar */}
      <header className="bg-transparent sticky top-0 z-50 mt-[-72px]">
        <div className="mx-auto px-4 sm:px-6 py-3 sm:py-4 container">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/antojos" className="flex items-center space-x-2">
              <Image
                src="/images/logo.png"
                alt={t('logoAlt')}
                width={32}
                height={32}
                className="w-6 h-6 sm:w-8 sm:h-8"
              />
              <span className="text-lg sm:text-xl font-bold text-gray-900 drop-shadow-sm">Mercampus</span>
            </Link>

            <div className="flex items-center gap-3 sm:gap-4">
              <LocaleSwitcher />

              {/* Explore products button */}
              <Link
                href="/antojos"
                className="bg-orange-500 text-white px-3 py-1.5 sm:px-6 sm:py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors duration-200 shadow-md hover:shadow-lg text-sm sm:text-base"
              >
                <span className="hidden xs:inline">{t('exploreLong')}</span>
                <span className="xs:hidden">{t('exploreShort')}</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
