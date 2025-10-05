'use client';
import React, { useEffect, useState } from 'react';
import { SignOutButton, useUser } from '@clerk/nextjs';
import SidebarBtn from '@/components/header/SidebarBtn';
import { useSeller } from '@/context/SellerContext';

import {
  MdFastfood,
  MdOutlineFastfood,
  MdShoppingBag,
  MdOutlineShoppingBag,
  MdLiveHelp,
  MdOutlineLiveHelp,
  MdEmojiPeople,
  MdInfo,
  MdOutlineInfo,
  MdAdminPanelSettings,
  MdOutlineAdminPanelSettings,
  MdSchool,
  MdOutlineSchool,
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
  FaHouseUser,
  FaPersonWalkingArrowLoopLeft,
  FaPersonWalkingDashedLineArrowRight,
  FaPersonWalkingLuggage,
} from 'react-icons/fa6';
import Link from 'next/link';

const SideBar = ({ userId }) => {
  const { seller, dbUser, loading: sellerLoading } = useSeller();
  const { user } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTutor, setIsTutor] = useState(false);
  const [isLandlord, setIsLandlord] = useState(false);

  useEffect(() => {
    // Solo procedemos si dbUser no es nulo
    const hasAdminRole = dbUser.roles?.includes('admin') || dbUser.role === 'admin';
    const hasTutorRole = dbUser.roles?.includes('tutor');
    const hasLandlordRole = dbUser.roles?.includes('landlord');
    setIsAdmin(hasAdminRole);
    setIsTutor(hasTutorRole);
    setIsLandlord(hasLandlordRole);
  }, [dbUser]);

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
          <li>
            <SidebarBtn
              text='Marketplace'
              goto='/marketplace'
              iconActive={<MdShoppingBag className='size-5' />}
              iconInactive={<MdOutlineShoppingBag className='size-5' />}
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
                {
                  <>
                    {(seller === "None" || seller === false) && (
                      <li>
                        <SidebarBtn
                          text='Quiero ser vendedor'
                          goto='/antojos/sellers/register'
                          iconActive={<BsPersonFillAdd className='size-5' />}
                          iconInactive={<BsPersonAdd className='size-5' />}
                        />
                      </li>
                    )}
                    {seller !== "None" && seller && !seller?.approved && (
                      <li>
                        <SidebarBtn
                          text='Solicitud en proceso'
                          goto='/antojos/sellers/approving'
                          iconActive={<BsPersonFillAdd className='size-5' />}
                          iconInactive={<BsPersonAdd className='size-5' />}
                        />
                      </li>
                    )}
                  </>
                }
              </ul>
            </details>
          </li>
           <li className='menu p-0'>
            <details open>
              <summary className='hover:cursor-pointer p-2 pe-4 mb-2'>
                <FaHouseUser className='size-5' />
                Arriendos
              </summary>
              <ul className='flex flex-col gap-2'>
                <li>
                  <SidebarBtn
                    text='Ver Arriendos'
                    goto='/landlords'
                    iconActive={<BsPeopleFill className='size-5' />}
                    iconInactive={<BsPeople className='size-5' />}
                  />
                </li>
                {!isLandlord && (
                  <li>
                    <SidebarBtn
                      text='Quiero ser arrendador'
                      goto='/landlords/register'
                      iconActive={<BsPersonFillAdd className='size-5' />}
                      iconInactive={<BsPersonAdd className='size-5' />}
                    />
                  </li>
                )}
              </ul>
            </details>
          </li>
          <li className='menu p-0'>
            <details open>
              <summary className='hover:cursor-pointer p-2 pe-4 mb-2'>
                <MdSchool className='size-5' />
                Tutorias
              </summary>
              <ul className='flex flex-col gap-2'>
                <li>
                  <SidebarBtn
                    text='Ver Tutores'
                    goto='/tutors'
                    iconActive={<BsPeopleFill className='size-5' />}
                    iconInactive={<BsPeople className='size-5' />}
                  />
                </li>
                {!isTutor && (
                  <li>
                    <SidebarBtn
                      text='Quiero ser tutor'
                      goto='/tutors/register'
                      iconActive={<BsPersonFillAdd className='size-5' />}
                      iconInactive={<BsPersonAdd className='size-5' />}
                    />
                  </li>
                )}
              </ul>
            </details>
          </li>
          {userId && seller?.approved && (
            <li className='menu p-0'>
              <details open>
                <summary className='hover:cursor-pointer p-2 pe-4 mb-2'>
                  <BsBuildingFillGear className='size-5' />
                  Gestionar Vendedor
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
          {userId && isLandlord && (
            <li className='menu p-0'>
              <details open>
                <summary className='hover:cursor-pointer p-2 pe-4 mb-2'>
                  <BsBuildingFillGear className='size-5' />
                  Gestionar Arriendos
                </summary>
                <ul className='flex flex-col gap-2'>
                  <li>
                    <SidebarBtn
                      text='Agregar arriendo'
                      goto='/rooms/add'
                      iconActive={<BsBagPlusFill className='size-5' />}
                      iconInactive={<BsBagPlus className='size-5' />}
                    />
                  </li>
                </ul>
              </details>
            </li>
          )}
           {userId && isTutor && (
            <li className='menu p-0'>
              <details open>
                <summary className='hover:cursor-pointer p-2 pe-4 mb-2'>
                  <BsBuildingFillGear className='size-5' />
                  Gestionar Tutorias
                </summary>
                <ul className='flex flex-col gap-2'>
                   <li>
                    <SidebarBtn
                      text='Editar mi perfil'
                      goto='/tutors/edit'
                      iconActive={<BsPersonFillGear className='size-5' />}
                      iconInactive={<BsPersonGear className='size-5' />}
                    />
                  </li>
                </ul>
              </details>
            </li>
          )}
          {isAdmin && (
            <li className='menu p-0'>
              <details open>
                <summary className='hover:cursor-pointer p-2 pe-4 mb-2'>
                  <MdAdminPanelSettings className='size-5' />
                  Administración
                </summary>
                <ul className='flex flex-col gap-2'>
                  <li>
                    <SidebarBtn
                      text='Gestionar vendedores'
                      goto='/admin/sellers'
                      iconActive={<MdAdminPanelSettings className='size-5' />}
                      iconInactive={<MdOutlineAdminPanelSettings className='size-5' />}
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
          <li>
            <SidebarBtn
              text='Sobre Mercampus'
              goto='/about'
              iconActive={<MdInfo className='size-5' />}
              iconInactive={<MdOutlineInfo className='size-5' />}
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
              <SignOutButton>
                <Link href="/" className='btn'>
                  <p>
                    <FaPersonWalkingArrowLoopLeft className='size-5' />
                    Cerrar Sesión
                  </p>
                </Link>
              </SignOutButton>
            </li>
          )}
        </div>
      </ul>
    </div>
  );
};

export default SideBar;
