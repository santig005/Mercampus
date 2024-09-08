import React from 'react';
import { TbMenu2 } from 'react-icons/tb';
import { TbUserFilled } from 'react-icons/tb';

export default function Navbar() {
  return (
    <>
      <button className='btn-icon'>
        <TbMenu2 className='icon' />
      </button>
      <button className='btn-icon !bg-slate-700'>
        <p className=''>
          <TbUserFilled className='icon text-primary' />
        </p>
      </button>
    </>
  );
}
