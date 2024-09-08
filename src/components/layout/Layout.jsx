import Navbar from '@/components/header/Navbar';
import React from 'react';

export default function Layout({ children }) {
  return (
    <div className='p-2 h-[calc(100dvh-0px)]'>
      <div className='h-16 w-full flex items-start justify-between'>
        <Navbar />
      </div>
      <div className='bg-primary h-[calc(100dvh-64px-16px)] rounded-md overflow-y-scroll overflow-x-hidden p-1 pb-4'>
        <div className='container mx-auto'>{children}</div>
      </div>
    </div>
  );
}
