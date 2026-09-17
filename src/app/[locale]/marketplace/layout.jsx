import Layout from '@/components/layout/Layout';
import React from 'react';
import { auth } from '@clerk/nextjs/server';
import SideBar from '@/components/seller/SideBar';
import { setRequestLocale } from 'next-intl/server';

// T-81: duplicated from src/app/marketplace/layout.jsx on purpose, not
// shared - see the matching note in src/app/[locale]/antojos/layout.jsx.
// That tree still owns /marketplace/[id], the only unmigrated marketplace
// sub-route, and its layout keeps wrapping it exactly as before.
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
