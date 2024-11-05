import Hambtn from '@/components/header/Hambtn';
import Layout from '@/components/layout/Layout';
import { useSession } from '@clerk/nextjs';
import Link from 'next/link';
import React from 'react';
import { auth } from '@clerk/nextjs/server';

export default async function layout({ children }) {
  const { userId } = await auth();
  return (
    <div className='drawer z-40'>
      <input id='my-dibujador' type='checkbox' className='drawer-toggle' />
      <div className='drawer-content'>
        <Layout>{children}</Layout>
      </div>
      <div className='drawer-side'>
        <label
          htmlFor='my-dibujador'
          aria-label='close sidebar'
          className='drawer-overlay'
        ></label>
        <ul className='menu text-base-content min-h-full w-80 p-4 pt-16 bg-primary'>
          {/* Sidebar content here */}
          <li>
            <Link href='/antojos/'>Antojitos</Link>
          </li>
          <li>
            <Link href='/antojos/sellers'>Mira los vendedores</Link>
          </li>
          {userId && (
            <>
              <li>
                <Link href='/antojos/registerseller'>Quiero ser vendedor</Link>
              </li>
              <li>
                <Link href='/antojos/registerseller/schedules'>
                  Agregar horarios
                </Link>
              </li>
              <li>
                <Link href='/antojos/addproduct/'>
                  Agregar productos
                </Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
