'use client';
import Carousel from '@/components/Carousel';
import { priceFormat } from '@/utils/utilFn';
import React, { useEffect, useState } from 'react';
import { TbChevronLeft } from 'react-icons/tb';
import { TbHeart } from 'react-icons/tb';
import { TbBrandWhatsapp } from 'react-icons/tb';
import { Link } from 'next-view-transitions';
import TableSche from '@/components/seller/index/table/TableSche';

export default function ProductModal({ product }) {
  const [seller, setSeller] = useState([]);


  useEffect(() => {
    console.log(product);
    if (product && product.sellerId) {
      const fetchProduct = async () => {
        try {
          setSeller(product.sellerId);
        } catch (error) {
          console.error('Error fetching seller:', error);
        }
          
      };
      fetchProduct();
    }
  }, [product]);
  return (
    <div>
      <dialog id='product_modal' className='modal modal-bottom'>
        {product ? (
          <>
            <div className='modal-box w-full h-dvh rounded-none bg-primary p-0 relative'>
              <div className='absolute w-full z-10'>
                <div className='modal-action m-0 justify-between p-2'>
                  <form method='dialog'>
                    <button className='btn btn-circle'>
                      <TbChevronLeft className='icon' />
                    </button>
                  </form>
                  {/* Hide like button */}
                  {/* <button className='btn btn-circle'>
                    <TbHeart className='icon' />
                  </button> */}
                </div>
              </div>

              <Carousel
                images={product.images}
                _id={product._id}
                key={product._id}
              />

              <div className='relative h-auto w-full'>
                <div className='bg-primary rounded-t-3xl w-full absolute -top-8 flex flex-col gap-2 pt-2'>
                  <div className='flex flex-col pb-36 gap-2'>
                    <h2 className='card-title px-6'>{product.name}</h2>
                    <Link
                      href={`/seller/${seller._id}`}
                      className='flex items-center gap-2 px-6'
                    >
                      <div className='rounded-full size-6 overflow-hidden'>
                        <img
                          className='img-full'
                          src={seller.logo}
                          alt={
                            'Imagen del publicador del producto ' + product.name
                          }
                        />
                      </div>
                      <p className='my-card-subtitle !text-[14px]'>
                        {seller.businessName}
                      </p>
                    </Link>
                    <p className='text-[14px] text-secondary px-6'>
                      {product.description}
                    </p>
                    <div className=''>
                      <h2 className='card-title px-6'>Horario</h2>
                      <TableSche schedules={schedules} />
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
                  <a className='btn btn-primary w-full' target='_blank' href={`https://wa.me/+57${seller.phoneNumber}?text=Hola ${seller.businessName},%20te%20vi%20en%20Mercampus%20`}>
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
