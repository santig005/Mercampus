import React from 'react';
import { TbMenu2 } from 'react-icons/tb';
import { TbUserFilled } from 'react-icons/tb';
import Link from 'next/link';
import Hambtn from './Hambtn';

export default function Navbar() {
  return (
    <>
      {/* <button className='btn-icon'>
        <TbMenu2 className='icon' />
      </button> */}
      <Hambtn />
      <Link href='/login' className='btn-icon !bg-slate-700'>
        <p className=''>
          <TbUserFilled className='icon text-primary' />
        </p>
      </Link>
    </>
  );
}
