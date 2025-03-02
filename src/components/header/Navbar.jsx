'use client';

import { TbUserFilled } from 'react-icons/tb';
import Hambtn from './Hambtn';
import { UserButton, useSession } from '@clerk/nextjs';
import Link from 'next/link';
import UniversitySelector from '@/components/university/UniversitySelector';
export default function Navbar() {
  const { session } = useSession();
  return (
    <>
      {/* <button className='btn-icon'>
        <TbMenu2 className='icon' />
      </button> */}
      
      <Hambtn />
      {session ? (
        <>
          <UniversitySelector />
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: {
                  width: '48px',
                  height: '48px',
                },
              },
            }}
          />
        </>
      ) : (
        <>
        <UniversitySelector />
        <Link href='/auth/login' className='btn-icon !bg-slate-700'>
          <p className=''>
            <TbUserFilled className='icon text-primary' />
          </p>
        </Link>
        </>
      )}
      
    </>
  );
}
