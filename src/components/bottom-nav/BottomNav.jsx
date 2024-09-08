import React from 'react';
import { TbMenu2 } from 'react-icons/tb';
import { TbUserFilled } from 'react-icons/tb';

export default function Nav({ children }) {
  return (
    <div className='p-2 h-[calc(100dvh-0px)]'>
      <div className='h-16 w-full flex items-center justify-between'>
        <button className='btn-icon'>
          <TbMenu2 className='icon' />
        </button>
        <button className='btn-icon !bg-slate-800'>
          <TbUserFilled className='icon text-primary' />
        </button>
      </div>
      <div className='bg-primary h-[calc(100dvh-64px-16px)] rounded-md overflow-y-scroll overflow-x-hidden p-0'>
        <div className='container mx-auto'>{children}</div>
      </div>
    </div>
  );
}
