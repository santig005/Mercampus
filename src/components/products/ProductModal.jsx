/* eslint-disable @next/next/no-img-element */
'use client';
import Carousel from '@/components/Carousel';
import { priceFormat } from '@/utils/utilFn';
import React, { memo, useEffect, useState } from 'react';
import { TbChevronLeft, TbHeart, TbBrandWhatsapp } from 'react-icons/tb';
import TableSchema from '@/components/seller/index/table/TableSchema';
import ShareButton from './share/ShareButton';
import SellerModal from '@/components/seller/index/SellerModal';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import { sendGAEvent } from '@next/third-parties/google';

function ProductModal({ product, theKey }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [availability, setAvailability] = useState('');
  const [images, setImages] = useState([]);
  const [seller, setSeller] = useState({});
  const [schedules, setSchedules] = useState([]);
  const [sellerModalId, setSellerModalId] = useState(null);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setDescription(product.description || '');
      setPrice(product.price || 0);
      setAvailability(product.availability || '');
      setImages(product.images || []);
      setSeller(product.sellerId || {});
      setSchedules(product.schedules || []);

      sendGAEvent('event', 'click_product', {
        action: 'Clicked Product',
        product_name: product.name,
        product_price: product.price,
        seller_name: product.sellerId?.businessName || '',
        product_id: product._id,
      });
    }
    // console.log(product);
  }, [product]);

  return (
    <div>
      <dialog
        id={`product_modal_${theKey}`}
        className='modal modal-top h-screen backdrop-blur-md'
      >
        {product ? (
          <>
            <div className='modal-box rounded-none bg-primary p-0 relative h-full modal-width shadow-lg'>
              <div className='sticky top-0 left-0'>
                <div className='absolute w-full z-10'>
                  <div className='modal-action m-0 justify-between p-2'>
                    <button
                      className='btn btn-circle'
                      onClick={() => {
                        document
                          .getElementById(`product_modal_${theKey}`)
                          .close();
                      }}
                    >
                      <TbChevronLeft className='icon' />
                    </button>
                  </div>
                </div>
                <SellerModal seller={sellerModalId} set={setSellerModalId} />
                <Carousel key={product._id} images={images} _id={product._id} />
              </div>

              <div className='relative h-auto bg-inherit'>
                <div className='bg-primary rounded-t-3xl w-full absolute -top-8 flex flex-col gap-2 pt-6'>
                  <div className='flex flex-col pb-56 gap-2'>
                    <div className='flex flex-col px-6 gap-1'>
                      <h2 className='text-lg font-semibold break-words'>
                        {name}
                      </h2>
                      <AvailabilityBadge availability={availability} />
                    </div>
                    <p className='text-[14px] text-secondary px-6'>
                      {description}
                    </p>
                    <button
                      className='btn max-w-min flex-nowrap mx-6'
                      onClick={() => {
                        const newSeller = { ...seller, schedules };
                        setSellerModalId(newSeller);
                        document.getElementById('seller_modal').showModal();
                      }}
                    >
                      <div className='rounded-full size-10 overflow-hidden'>
                        <img
                          className='img-full'
                          src={seller.logo}
                          alt='Imagen del publicador del producto'
                        />
                      </div>
                      <p className='my-card-subtitle !text-[14px] text-nowrap'>
                        {seller.businessName}
                      </p>
                    </button>
                    <div>
                      <h2 className='card-title px-6'>Horario</h2>
                      {schedules && <TableSchema schedules={schedules} />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className='fixed bottom-0 h-auto w-full'>
              <div className='bg-gray-200 rounded-t-3xl p-4 pb-24 flex flex-col h-64 justify-center modal-width'>
                <h3 className='font-bold text-lg'>{priceFormat(price)}</h3>
                <p className='py-4'>
                  <a
                    className='btn btn-primary w-full'
                    target='_blank'
                    href={`https://wa.me/+57${encodeURIComponent(
                      seller?.phoneNumber || ''
                    )}?text=${encodeURIComponent(
                      `Hola ${
                        seller?.businessName || 'estimado vendedor'
                      }, te vi en Mercampus. Estoy interesado en el producto ${name}. Podrías decirme dónde te encuentras?`
                    )}`}
                    aria-label={`Contactar a ${
                      seller?.businessName || 'el vendedor'
                    } por WhatsApp`}
                    onClick={() => {
                      sendGAEvent('event', 'click_whatsapp_product', {
                        action: 'Clicked WhatsApp Link',
                        product_name: name,
                        product_id: product._id,
                        seller_name: seller.businessName,
                      });
                    }}
                  >
                    Contactar por WhatsApp <TbBrandWhatsapp className='icon' />
                  </a>
                  <ShareButton data={product} type='product' />
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

export default memo(ProductModal);
