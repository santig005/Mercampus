/* eslint-disable @next/next/no-img-element */
import React from 'react';
import {
  TbChevronLeft,
  TbBrandWhatsapp,
  TbBrandInstagram,
} from 'react-icons/tb';
import Carousel from '@/components/Carousel';
import TableSche from '@/components/seller/index/table/TableSche';
import { useEffect, useState } from 'react';

export default function SellerModal({ seller, set }) {
  const [schedules, setSchedules] = useState([]); // Estado para almacenar los horarios
  const [images, setImages] = useState([]); // Estado para almacenar las imágenes
  useEffect(() => {
    // Función para obtener los horarios del vendedor desde la API
    async function fetchSchedules() {
      try {
        setSchedules(seller.schedules);
      } catch (error) {
        console.error('Error fetching schedules:', error);
      }
    }
    if (seller) {
      fetchSchedules();
      setImages([seller.logo]);
    }
  }, [seller]);

  return (
    <>
      <dialog id={`seller_modal`} className='modal modal-bottom'>
        {seller && (
          <>
            <div className='modal-box w-full h-dvh rounded-none bg-primary p-0 relative'>
              <div className='sticky top-0 left-0'>
                <div className='absolute w-full z-10'>
                  <div className='modal-action m-0 justify-between p-2'>
                    <button
                      className='btn btn-circle'
                      onClick={() => {
                        document.getElementById(`seller_modal`).close();
                        setTimeout(() => {
                          set(null);
                        }, 150);
                      }}
                    >
                      <TbChevronLeft className='icon' />
                    </button>
                  </div>
                </div>
                <Carousel key={seller._id} images={images} _id={seller._id} />
              </div>

              <div className='relative h-dvh w-full bg-inherit'>
                <div className='bg-primary rounded-t-3xl w-full absolute -top-8 flex flex-col gap-2 pt-6'>
                  <div className='flex flex-col pb-36 gap-2'>
                    <h2 className='card-title px-6 pt-2'>
                      {seller.businessName}
                    </h2>
                    <div className='flex items-center gap-2 px-6'>
                      <div className='rounded-full size-6 overflow-hidden'>
                        <img
                          className='img-full'
                          src={seller.logo}
                          alt={`Logo del vendedor ${seller.businessName}`}
                        />
                      </div>
                      <p className='my-card-subtitle !text-[14px]'>
                        {seller.businessName}
                      </p>
                    </div>
                    <p className='text-[14px] text-secondary px-6'>
                      {seller.description}
                    </p>
                    <p className='text-[14px] text-secondary px-6'>
                      {seller.slogan}
                    </p>
                    <div className=''>
                      <h2 className='card-title px-6'>Horario</h2>
                      <TableSche schedules={schedules} />
                    </div>
                    <div className=''>
                      <h2 className='card-title px-6'>Contacto</h2>
                      <p className='text-[14px] text-secondary px-6'>
                        {seller.phoneNumber}
                      </p>
                      <p className='text-[14px] text-secondary px-6'>
                        {seller.instagramUser}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className='bg-gray-200 rounded-t-3xl p-2 fixed bottom-0 w-full h-24 px-6'>
              <div className='flex justify-center items-center h-full'>
                <div className='join w-full'>
                  <a
                    href={`https://www.instagram.com/_u/${seller.instagramUser}`}
                    className='btn btn-primary join-item w-1/2'
                    target='_blank'
                    referrerPolicy='no-referrer'
                  >
                    <TbBrandInstagram className='icon' /> Instagram
                  </a>
                  <a
                    href={`https://wa.me/+57${seller.phoneNumber}?text=Hola ${seller.businessName},%20te%20vi%20en%20Mercampus%20`}
                    className='btn btn-primary join-item w-1/2'
                    target='_blank'
                    referrerPolicy='no-referrer'
                  >
                    <TbBrandWhatsapp className='icon' /> WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
