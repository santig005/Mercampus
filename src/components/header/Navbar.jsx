'use client';

import { TbUserFilled } from 'react-icons/tb';
import { Link } from 'next-view-transitions';
import Hambtn from './Hambtn';
import { SignOutButton, UserButton, useSession } from '@clerk/nextjs';
import { IoChatbox } from 'react-icons/io5';

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
        <Link href='/auth/login' className='btn-icon !bg-slate-700'>
          <p className=''>
            <TbUserFilled className='icon text-primary' />
          </p>
        </Link>
      )}
    </>
  );
}
