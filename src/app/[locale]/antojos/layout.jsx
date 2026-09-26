import Layout from '@/components/layout/Layout';
import React from 'react';
import { auth } from '@clerk/nextjs/server';
import SideBar from '@/components/seller/SideBar';
import { setRequestLocale } from 'next-intl/server';
import LocaleSwitcher from '@/components/general/LocaleSwitcher';

// T-81: duplicated from src/app/antojos/layout.jsx on purpose, not shared.
// That tree still owns the antojos sub-routes that have not migrated yet
// (/antojos/product/add, /antojos/game, /antojos/pqrs, and the seller's own
// forms) and its layout keeps wrapping them exactly as before - a route
// segment under [locale] cannot span into that sibling, non-locale tree.
// This copy wraps the zones already migrated: the listing, product detail,
// and the public seller profile and list. See ROADMAP.md T-81.
//
// LocaleSwitcher renders here, outside <Layout>, instead of going into
// Layout/Navbar - those two are shared with the non-migrated
// src/app/antojos/layout.jsx (see the comment in Layout.jsx), so putting it
// there would leak the switcher into a tree this task explicitly must not
// touch.
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
          <LocaleSwitcher />
        </div>
        <Layout>
          {children}
        </Layout>
      </div>
      <SideBar userId={userId} />
    </div>
  );
}
