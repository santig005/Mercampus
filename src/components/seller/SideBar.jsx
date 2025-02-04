'use client';
import React,{useEffect} from 'react';
import { SignOutButton } from '@clerk/nextjs';
import SidebarBtn from '@/components/header/SidebarBtn';
import { useSeller } from '@/context/SellerContext';

import {
  MdFastfood,
  MdOutlineFastfood,
  MdLiveHelp,
  MdOutlineLiveHelp,
  MdEmojiPeople,
} from 'react-icons/md';

import {
  BsBagCheck,
  BsBagCheckFill,
  BsBagPlus,
  BsBagPlusFill,
  BsBuildingFillGear,
  BsCalendarCheck,
  BsCalendarCheckFill,
  BsPeople,
  BsPeopleFill,
  BsPersonAdd,
  BsPersonFillAdd,
  BsPersonFillGear,
  BsPersonGear,
} from 'react-icons/bs';

import {
  FaPersonWalkingArrowLoopLeft,
  FaPersonWalkingDashedLineArrowRight,
  FaPersonWalkingLuggage,
} from 'react-icons/fa6';

const SideBar = ({ userId }) => {
  const { seller, loading: sellerLoading } = useSeller();
  
    // Don't delete these useEffect please
    useEffect(() => {
      if (!sellerLoading) {
        if (seller===false) {
          //window.location.href = '/antojos/sellers/register';
        }
      }
    }, [seller, sellerLoading]);

  return (
      <div className='drawer-side'>
        <label
          htmlFor='my-dibujador'
          aria-label='close sidebar'
          className='drawer-overlay'
        ></label>
        <ul className='menu text-base-content min-h-full w-72 p-4 pt-16 bg-primary flex flex-col justify-between'>
          <div className='mt-4 flex flex-col gap-2'>
            <li>
              <SidebarBtn
                text='Antojitos'
                goto='/antojos'
                iconActive={<MdFastfood className='size-5' />}
                iconInactive={<MdOutlineFastfood className='size-5' />}
              />
            </li>
            <li className='menu p-0'>
              <details open>
                <summary className='hover:cursor-pointer p-2 pe-4 mb-2'>
                  <MdEmojiPeople className='size-5' />
                  Vendedores
                </summary>
                <ul className='flex flex-col gap-2'>
                  <li>
                    <SidebarBtn
                      text='Lista de vendedores'
                      goto='/antojos/sellers/list'
                      iconActive={<BsPeopleFill className='size-5' />}
                      iconInactive={<BsPeople className='size-5' />}
                    />
                  </li>
                  {(
                   <>
                      {!seller &&(<li>
                        <SidebarBtn
                          text='Quiero ser vendedor'
                          goto='/antojos/sellers/register'
                          iconActive={<BsPersonFillAdd className='size-5' />}
                          iconInactive={<BsPersonAdd className='size-5' />}
                        />
                      </li>)
                      }
                      {seller && !seller?.approved &&(<li>
                        <SidebarBtn
                          text='Solicitud en proceso'
                          goto='/antojos/sellers/approving'
                          iconActive={<BsPersonFillAdd className='size-5' />}
                          iconInactive={<BsPersonAdd className='size-5' />}
                        />
                      </li>)
                      }
                    </>
                  )}
                </ul>
              </details>
            </li>
            {userId && seller?.approved && (
              <li className='menu p-0'>
                <details open>
                  <summary className='hover:cursor-pointer p-2 pe-4 mb-2'>
                    <BsBuildingFillGear className='size-5' />
                    Gestionar
                  </summary>
                  <ul className='flex flex-col gap-2'>
                    <li>
                      <SidebarBtn
                        text='Agregar productos'
                        goto='/antojos/product/add'
                        iconActive={<BsBagPlusFill className='size-5' />}
                        iconInactive={<BsBagPlus className='size-5' />}
                      />
                    </li>
                    <li>
                      <SidebarBtn
                        text='Editar mis productos'
                        goto='/antojos/sellers/products/edit'
                        iconActive={<BsBagCheckFill className='size-5' />}
                        iconInactive={<BsBagCheck className='size-5' />}
                      />
                    </li>
                    <li>
                        <SidebarBtn
                          text='Editar mi perfil'
                          goto='/antojos/sellers/profile/edit'
                          iconActive={<BsPersonFillGear className='size-5' />}
                          iconInactive={<BsPersonGear className='size-5' />}
                        />
                      </li>
                    <li>
                      <SidebarBtn
                        text='Mis horarios'
                        goto='/antojos/sellers/schedules'
                        iconActive={<BsCalendarCheckFill className='size-5' />}
                        iconInactive={<BsCalendarCheck className='size-5' />}
                      />
                    </li>
                  </ul>
                </details>
              </li>
            )}
            <li>
              <SidebarBtn
                text='Ayuda'
                goto='/antojos/pqrs'
                iconActive={<MdLiveHelp className='size-5' />}
                iconInactive={<MdOutlineLiveHelp className='size-5' />}
              />
            </li>
          </div>
          <div className='mb-4'>
            {!userId ? (
              <li className='flex flex-col gap-2'>
                <SidebarBtn
                  text='Iniciar Sesión'
                  goto='/auth/login'
                  iconInactive={
                    <FaPersonWalkingDashedLineArrowRight className='size-5' />
                  }
                />
                <SidebarBtn
                  text='Regístrate'
                  goto='/auth/register'
                  iconInactive={<FaPersonWalkingLuggage className='size-5' />}
                />
              </li>
            ) : (
              <li>
                <SignOutButton className='btn'>
                  <p>
                    <FaPersonWalkingArrowLoopLeft className='size-5' />
                    Cerrar Sesión
                  </p>
                </SignOutButton>
              </li>
            )}
          </div>
        </ul>
      </div>
  );
};

export default SideBar;