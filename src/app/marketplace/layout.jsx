import Layout from '@/components/layout/Layout';
import React from 'react';
import { auth } from '@clerk/nextjs/server';
import SideBar from '@/components/seller/SideBar';


export default async function layout({ children }) {
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
