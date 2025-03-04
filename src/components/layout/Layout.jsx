import Navbar from '@/components/header/Navbar';
import React from 'react';

export default function Layout({ children }) {
  return (
    <div className='h-[calc(100dvh-0px)] bg-transparent'>
      <div className='h-16 w-full flex items-start justify-between p-2'>
        <Navbar />
      </div>
      <div className='bg-primary h-[calc(100dvh-64px)] rounded-md overflow-y-scroll overflow-x-hidden pb-4 hide-scrollbar'>
        <div className='container mx-auto'>{children}</div>
      </div>
    </div>
  );
}
