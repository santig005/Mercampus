import Carousel from '@/components/Carousel';
import TableSche from '@/components/products/table/TableSche';
import React from 'react';
import { TbChevronLeft } from 'react-icons/tb';
import { TbHeart } from 'react-icons/tb';
import { TbBrandWhatsapp } from 'react-icons/tb';

export default function ProductModal({ product }) {
  return (
    <div>
      <dialog id={product._id} className='modal modal-bottom'>
        <div className='modal-box w-full h-dvh rounded-none bg-primary p-0 relative'>
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

          {/* <div className='size-72 w-full'>
            <img
              src={product.thumbnail}
              alt={product.name}
              className='img-full'
            />
          </div> */}
          <Carousel
            images={[product.thumbnail, product.thumbnail, product.thumbnail]}
            _id={product._id}
          />

          <div className='relative h-auto w-full'>
            <div className='bg-primary rounded-t-3xl w-full absolute -top-8 flex flex-col gap-2 pt-2'>
              <div className='flex flex-col pb-36 gap-2'>
                <h2 className='card-title px-6'>{product.name}</h2>
                <div className='flex items-center gap-2 px-6'>
                  <div className='rounded-full size-6 overflow-hidden'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className='img-full'
                      src={product.thumbnail}
                      alt={'Imagen del publicador del producto ' + product.name}
                    />
                  </div>

                  <p className='my-card-subtitle !text-[14px]'>
                    {product.owner}
                  </p>
                </div>
                <p className='text-[14px] text-secondary px-6'>
                  Deliciosos cupcakes de oreo, redvelvet y arequipe para que
                  puedas disfrutasr como postre y calmar tu antojo.
                </p>
                <div className=''>
                  <h2 className='card-title px-6'>Horario</h2>
                  <TableSche />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='bg-gray-200 rounded-t-3xl p-2 fixed bottom-0 w-full h-32 px-6'>
          <div className='flex flex-col h-full justify-center'>
            <h3 className='font-bold text-lg'>{product.price}</h3>
            <p className='py-4'>
              <button className='btn btn-primary w-full'>
                Contactar por WhatsApp <TbBrandWhatsapp className='icon' />
              </button>
            </p>
          </div>
        </div>
      </dialog>
    </div>
  );
}
