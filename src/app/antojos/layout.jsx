import Hambtn from '@/components/header/Hambtn';
import Layout from '@/components/layout/Layout';
import { useSession } from '@clerk/nextjs';
import Link from 'next/link';
import React from 'react';
import { auth } from '@clerk/nextjs/server';
import { SignOutButton } from '@clerk/nextjs';
import SidebarBtn from '@/components/header/SidebarBtn';

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
        <ul className='menu text-base-content min-h-full w-80 p-4 pt-16 bg-primary flex flex-col justify-between'>
          <div>
            <li>
              {/* <Link href='/antojos/'>Antojitos</Link> */}
              <SidebarBtn text='Antojitos' goto='/antojos/' />
            </li>
            <li>
              <SidebarBtn text='Mira los vendedores' goto='/antojos/sellers' />
            </li>
            {userId && (
              <>
                <li>
                  <SidebarBtn
                    text='Quiero ser vendedor'
                    goto='/antojos/registerseller'
                  />
                </li>
                <li>
                  <SidebarBtn
                    text='Agregar horarios'
                    goto='/antojos/registerseller/schedules'
                  />
                </li>
                <li>
                  <SidebarBtn
                    text='Agregar productos'
                    goto='/antojos/addproduct/'
                  />
                </li>
              </>
            )}
          </div>
          <div>
            {!userId ? (
              <li>
                <SidebarBtn text='Regístrate' goto='/auth/register' />
                <SidebarBtn text='Inicia Sesión' goto='/auth/login' />
              </li>
            ) : (
              <li>
                <SignOutButton className='btn'>Cerrar Sesión</SignOutButton>
              </li>
            )}
          </div>
        </ul>
      </div>
    </div>
  );
}
