import Layout from '@/components/layout/Layout';
import React from 'react';
import { auth } from '@clerk/nextjs/server';
import SideBar from '@/components/seller/SideBar';
import { setRequestLocale } from 'next-intl/server';
import LocaleSwitcher from '@/components/general/LocaleSwitcher';

// T-81: duplicated from src/app/marketplace/layout.jsx on purpose, not
// shared - see the matching note in src/app/[locale]/antojos/layout.jsx.
// That tree still owns /marketplace/[id], the only unmigrated marketplace
// sub-route, and its layout keeps wrapping it exactly as before.
//
// LocaleSwitcher renders here, outside <Layout>, instead of going into
// Layout/Navbar - those are shared with the non-migrated
// src/app/marketplace/layout.jsx, so putting it there would leak the
// switcher into a tree this task must not touch (see the matching note in
// the antojos layout).
//
// dark:bg-base-200 on this row: it sits directly on <body>'s bg-primary,
// which public/css/main.css pins to near-white in BOTH themes (see the
// bg-primary note in CLAUDE.md - it caused a real light-on-dark regression
// in T-100). Layout's own header row carries the same override for the
// same reason; without it this strip would render light even in dark mode.
export default async function layout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { userId } = await auth();
  return (
    <div className='drawer z-40'>
      <input id='my-dibujador' type='checkbox' className='drawer-toggle' />
      <div className='drawer-content'>
        <div className='flex justify-end px-3 pt-2 sm:px-4 dark:bg-base-200'>
          <LocaleSwitcher basePath="marketplace" />
        </div>
        <Layout>
          {children}
        </Layout>
      </div>
      <SideBar userId={userId} />
    </div>
  );
}
