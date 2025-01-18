/* eslint-disable @next/next/no-img-element */
'use client';
import Carousel from '@/components/Carousel';
import { priceFormat } from '@/utils/utilFn';
import React, { useEffect, useState } from 'react';
import { TbChevronLeft } from 'react-icons/tb';
import { TbHeart } from 'react-icons/tb';
import { TbBrandWhatsapp } from 'react-icons/tb';
import TableSchema from '@/components/seller/index/table/TableSchema';
import SellerModal from '@/components/seller/index/SellerModal';

export default function ProductModal({ product, set }) {
  const [seller, setSeller] = useState({});
  const [schedules, setSchedules] = useState([]);
  const [sellerModalId, setSellerModalId] = useState(null);

  useEffect(() => {
    if (product && product.sellerId) {
      setSeller(product.sellerId);
      setSchedules(product.schedules);
    }
  }, [product]);

  return (
    <div>
      <dialog id='product_modal' className='modal modal-top h-screen'>
        {product ? (
          <>
            <div className='modal-box w-full h-full rounded-none bg-primary p-0 relative'>
              <div className='sticky top-0 left-0'>
                <div className='absolute w-full z-10'>
                  <div className='modal-action m-0 justify-between p-2'>
                    <button
                      className='btn btn-circle'
                      onClick={() => {
                        document.getElementById('product_modal').close();
                      }}
                    >
                      <TbChevronLeft className='icon' />
                    </button>
                  </div>
                </div>
                <SellerModal seller={sellerModalId} set={setSellerModalId} />
                <Carousel
                  key={product._id}
                  images={product.images}
                  _id={product._id}
                />
              </div>

              <div className='relative h-full w-full bg-inherit'>
                <div className='bg-primary rounded-t-3xl w-full absolute -top-8 flex flex-col gap-2 pt-6'>
                  <div className='flex flex-col pb-36 gap-2'>
                    <h2 className='card-title px-6 mt-2'>{product.name}</h2>
                    <button
                      // href={`/seller/${seller._id}`}
                      className='btn max-w-min flex-nowrap mx-6'
                      onClick={() => {
                        const newSeller = {
                          ...product.sellerId,
                          schedules: product.schedules,
                        };
                        setSellerModalId(newSeller);
                        document.getElementById('seller_modal').showModal();
                      }}
                    >
                      <div className='rounded-full size-10 overflow-hidden'>
                        <img
                          className='img-full'
                          src={seller.logo}
                          alt={
                            'Imagen del publicador del producto '
                          }
                        />
                      </div>
                      <p className='my-card-subtitle !text-[14px] text-nowrap'>
                        {seller.businessName}
                      </p>
                    </button>
                    <p className='text-[14px] text-secondary px-6'>
                      {product.description}
                    </p>
                    <div className=''>
                      <h2 className='card-title px-6'>Horario</h2>
                      {schedules && <TableSchema schedules={schedules} />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className='bg-gray-200 rounded-t-3xl p-2 fixed bottom-0 w-full h-32 px-6'>
              <div className='flex flex-col h-full justify-center'>
                <h3 className='font-bold text-lg'>
                  {priceFormat(product.price)}
                </h3>
                <p className='py-4'>
                  <a
                    className='btn btn-primary w-full'
                    target='_blank'
                    href={`https://wa.me/+57${encodeURIComponent(seller?.phoneNumber || '')}?text=${encodeURIComponent(`Hola ${seller?.businessName || 'estimado vendedor'}, te vi en Mercampus. Estoy interesado en el producto ${product.name}. Podrías decirme dónde te encuentras?`)}`}
  aria-label={`Contactar a ${seller?.businessName || 'el vendedor'} por WhatsApp`}
                  >
                    Contactar por WhatsApp <TbBrandWhatsapp className='icon' />
                  </a>
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className='relative'>
            <div className='absolute w-full z-10'>
              <div className='modal-action m-0 justify-between p-2'>
                <form method='dialog'>
                  <button className='btn btn-circle'>
                    <TbChevronLeft className='icon' />
                  </button>
                </form>
                <button className='btn btn-circle'>
                  <TbHeart className='icon' />
                </button>
              </div>
            </div>
            <h2 className='font-medium text-pretty'>
              Algo salió mal, por favor intente de nuevo
            </h2>
          </div>
        )}
      </dialog>
    </div>
  );
}
