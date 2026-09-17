import Layout from '@/components/layout/Layout';
import React from 'react';
import { auth } from '@clerk/nextjs/server';
import SideBar from '@/components/seller/SideBar';
import { setRequestLocale } from 'next-intl/server';

// T-81: duplicated from src/app/antojos/layout.jsx on purpose, not shared.
// That tree still owns every unmigrated antojos sub-route (/antojos/[id],
// /antojos/sellers/*, /antojos/product/add, /antojos/game, /antojos/pqrs)
// and its layout keeps wrapping them exactly as before - a route segment
// under [locale] cannot span into that sibling, non-locale tree. This copy
// only wraps the migrated listing page. See ROADMAP.md T-81.
export default async function layout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { userId } = await auth();
  return (
    <div className='drawer z-40'>
      <input id='my-dibujador' type='checkbox' className='drawer-toggle' />
      <div className='drawer-content'>
        <Layout>
          {children}
        </Layout>
      </div>
      <SideBar userId={userId} />
    </div>
  );
}
