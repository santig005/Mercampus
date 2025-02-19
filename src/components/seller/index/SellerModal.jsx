/* eslint-disable @next/next/no-img-element */
import React from 'react';
import {
  TbChevronLeft,
  TbBrandWhatsapp,
  TbBrandInstagram,
} from 'react-icons/tb';
import Carousel from '@/components/Carousel';
import TableSchema from '@/components/seller/index/table/TableSchema';
import { useEffect, useState } from 'react';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import { sendGAEvent } from '@next/third-parties/google';
import ShareButton from '@/components/products/share/ShareButton';
import ProductGrid from '@/components/products/ProductGrid';

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
      sendGAEvent('event', 'click_profile', {
        action: 'Clicked Profile',
        seller_name: seller.businessName,
        seller_id: seller._id,
      });
    }
  }, [seller]);

  return (
    <>
      <dialog
        id={`seller_modal`}
        className='modal modal-top h-screen backdrop-blur-md'
      >
        {seller && (
          <>
            <div className='modal-box w-full h-full rounded-none bg-primary p-0 relative modal-width'>
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

              <div className='relative h-auto w-full bg-inherit'>
                <div className='bg-primary rounded-t-3xl w-full absolute -top-8 flex flex-col gap-2 pt-6'>
                  <div className='flex flex-col pb-32 gap-2'>
                    <div className='px-6 pt-2 mb-1'>
                      <div className='flex flex-col gap-1'>
                        <h2 className='card-title '>{seller.businessName}</h2>{' '}
                        {/* <span className='text-4xl mx-2'>•</span> */}
                        <AvailabilityBadge availability={seller.availability} />
                      </div>
                    </div>
                    {seller.slogan && (
                      <p className='text-[14px] px-6 italic text-secondary'>
                        &quot;
                        <span className='text-primary bg-primary/10 p-1 rounded-md mx-1 leading-8'>
                          {seller.slogan}
                        </span>
                        &quot;
                      </p>
                    )}
                    <p className='text-[16px] text-black px-6'>
                      {seller.description}
                    </p>
                    <div className='flex flex-col gap-4 mt-4'>
                      <div className=''>
                        <h2 className='card-title px-6 mb-2'>Horario</h2>
                        <TableSchema schedules={schedules} />
                      </div>
                      <div className=''>
                        <h2 className='card-title px-6 mb-2'>
                          ¡Antojate de algo mas de este vendedor!
                        </h2>
                        <div className='px-2'>
                          <ProductGrid sellerIdParam={seller._id} />
                        </div>
                      </div>
                    </div>
                    {/* <div className=''>
                      <h2 className='card-title px-6'>Contacto</h2>
                      <p className='text-[14px] text-secondary px-6'>
                        {seller.phoneNumber}
                      </p>
                      <p className='text-[14px] text-secondary px-6'>
                        {seller.instagramUser}
                      </p>
                    </div> */}
                  </div>
                </div>
              </div>
            </div>
            <div className='fixed bottom-0 h-auto w-full'>
              <div className='bg-gray-200 rounded-t-3xl p-4 flex flex-col h-full justify-center modal-width'>
                <div className='flex justify-center items-center h-full'>
                  <div className='flex flex-col justify-between w-full'>
                    <div className='join w-full'>
                      <a
                        href={`https://www.instagram.com/_u/${seller.instagramUser}`}
                        className='btn btn-primary border-none join-item w-1/2'
                        target='_blank'
                        referrerPolicy='no-referrer'
                        onClick={() => {
                          sendGAEvent('event', 'click_instagram', {
                            action: 'Clicked Instagram Link',
                            seller_name: seller.businessName,
                            seller_instagramUser: seller.instagramUser,
                            seller_id: seller._id,
                          });
                        }}
                      >
                        <TbBrandInstagram className='icon' /> Instagram
                      </a>
                      <a
                        href={`https://wa.me/+57${seller.phoneNumber}?text=Hola ${seller.businessName},%20te%20vi%20en%20Mercampus%20`}
                        className='btn btn-primary join-item w-1/2'
                        target='_blank'
                        referrerPolicy='no-referrer'
                        onClick={() => {
                          sendGAEvent('event', 'click_whatsapp_seller', {
                            action: 'Clicked WhatsApp Link',
                            seller_name: seller.businessName,
                            seller_id: seller._id,
                          });
                        }}
                      >
                        <TbBrandWhatsapp className='icon' /> WhatsApp
                      </a>
                    </div>
                    <ShareButton data={seller} type='seller' />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
