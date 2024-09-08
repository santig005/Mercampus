import React from 'react';
import Navbar from './Navbar';

export default function Nav({ children }) {
  return (
    <div className='p-2 h-[calc(100dvh-0px)]'>
      <div className='h-16 w-full flex items-center justify-between'>
        <Navbar />
      </div>
      <div className='bg-primary h-[calc(100dvh-64px-16px)] rounded-md overflow-y-scroll overflow-x-hidden'>
        <div className='container mx-auto'>{children}</div>
      </div>
    </div>
  );
}
