/* eslint-disable @next/next/no-img-element */
'use client';
import Carousel from '@/components/Carousel';
import { parseIfJSON, priceFormat } from '@/utils/utilFn';
import React, { memo, useEffect, useRef, useState } from 'react';
import {
  TbChevronLeft,
  TbHeart,
  TbBrandWhatsapp,
  TbShare2,
} from 'react-icons/tb';
import TableSchema from '@/components/seller/index/table/TableSchema';
import ShareButton from './share/ShareButton';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import { sendGAEvent } from '@next/third-parties/google';
import { useTranslations } from 'next-intl';

// T-167: rendered once, by the modal stack (components/modals/ModalStack.jsx),
// which opens it from the URL (?producto=) and closes it by going back in
// history. It used to be rendered by a ProductModalHandler in every list and
// opened by element id, and it carried its own nested SellerModal - so every
// product -> seller -> product hop mounted another pair of dialogs. Now the
// seller is opened through the stack too (`onOpenSeller`), as its own entry.
function ProductModal({ product, theKey, open, onClose, onOpenSeller }) {
  const dialogRef = useRef(null);
  // Its own namespace, not ProductPage's, even where the copy matches: the
  // two stopped being twins in T-167 (this one has the error state and the
  // favourites placeholder), same convention T-81 used for AddProductPage /
  // EditProductForm.
  const t = useTranslations('ProductModal');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [availability, setAvailability] = useState('');
  const [images, setImages] = useState([]);
  const [seller, setSeller] = useState({});
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setDescription(product.description || '');
      setPrice(product.price || 0);
      setAvailability(product.availability || '');
      setImages(product.images || []);
      setSeller(product.sellerId || {});
      setSchedules(product.schedules || []);

      sendGAEvent('event', 'product_click', {
        action: 'Clicked Product',
        product_name: product.name,
        product_price: product.price,
        seller_name: product.sellerId?.businessName || '',
        product_id: product._id,
      });
    }
  }, [product]);

  // T-167d: this component's own share sheet, not the first one in the page.
  const shareRef = useRef(null);
  const handleShowModal = () => shareRef.current?.open();

  return (
    <div>
      <dialog
        ref={dialogRef}
        id={`product_modal_${theKey}`}
        className='modal modal-top h-dvh backdrop-blur-md'
        // Escape: the URL has to change too, so the stack closes it
        // (history.back) instead of the browser closing only the dialog.
        onCancel={event => {
          event.preventDefault();
          onClose();
        }}
      >
        <ShareButton ref={shareRef} data={product} type='product' />
        {product ? (
          <>
            {/* T-73: dark:bg-base-100 - bg-primary rinde un blanco fijo
                (override en main.css), no el naranja de marca; ver la nota
                en Layout.jsx. */}
            <div className='modal-box rounded-none bg-primary dark:bg-base-100 p-0 relative h-full modal-width shadow-lg'>
              <div className='sticky top-0 left-0'>
                <div className='absolute w-full z-10'>
                  <div className='modal-action m-0 justify-between p-2'>
                    <button
                      className='btn btn-circle'
                      aria-label={t('close')}
                      onClick={onClose}
                    >
                      <TbChevronLeft className='icon' />
                    </button>
                  </div>
                </div>
                <Carousel key={product._id} images={images} _id={product._id} />
              </div>

              <div className='relative h-auto bg-inherit'>
                <div className='bg-primary dark:bg-base-100 rounded-t-3xl w-full absolute -top-8 flex flex-col gap-2 pt-6'>
                  <div className='flex flex-col pb-56 gap-2'>
                    <div className='flex flex-col px-6 gap-1'>
                      <h2 className='text-lg font-semibold break-words dark:text-base-content'>
                        {name}
                      </h2>
                      <AvailabilityBadge
                        availability={availability}
                        status={product.availabilityStatus}
                      />
                    </div>
                    <p className='text-[14px] text-secondary px-6 text-balance whitespace-pre-wrap'>
                      {parseIfJSON(description)}
                    </p>
                    <button
                      className='btn max-w-min flex-nowrap mx-6'
                      // The seller with the schedules this product already
                      // carries: SellerModal's shape, no request needed.
                      onClick={() => onOpenSeller({ ...seller, schedules })}
                    >
                      <div className='rounded-full size-10 overflow-hidden'>
                        <img
                          className='img-full'
                          src={seller.logo}
                          alt={t('sellerLogoAlt')}
                        />
                      </div>
                      <p className='my-card-subtitle !text-[14px] text-nowrap'>
                        {seller.businessName}
                      </p>
                    </button>
                    <div>
                      <h2 className='card-title px-6 dark:text-base-content'>{t('scheduleHeading')}</h2>
                      {schedules && <TableSchema schedules={schedules} />}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='fixed bottom-0 h-auto w-full'>
              <div className='bg-base-200 text-base-content rounded-t-3xl p-4 flex flex-col h-auto justify-center modal-width shadow-2xl shadow-black drop-shadow-2xl'>
                <h3 className='font-bold text-lg'>{priceFormat(price)}</h3>
                <div className='pt-2'>
                  <a
                    className='btn btn-primary w-full'
                    target='_blank'
                    href={`https://wa.me/+57${encodeURIComponent(
                      seller?.phoneNumber || ''
                    )}?text=${encodeURIComponent(
                      t('whatsappMessage', {
                        seller: seller?.businessName || t('defaultSellerGreeting'),
                        product: name,
                      })
                    )}`}
                    aria-label={t('contactWhatsappAria', {
                      seller: seller?.businessName || t('defaultSeller'),
                    })}
                    onClick={() => {
                      sendGAEvent('event', 'click_whatsapp_product', {
                        action: 'Clicked WhatsApp Link',
                        product_name: name,
                        product_id: product._id,
                        seller_name: seller.businessName,
                      });
                    }}
                  >
                    {t('contactWhatsapp')} <TbBrandWhatsapp className='icon' />
                  </a>

                  <button
                    className='btn btn-secondary w-full mt-2'
                    onClick={handleShowModal}
                  >
                    {t('recommend')} <TbShare2 className='icon' />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className='relative'>
            <div className='absolute w-full z-10'>
              <div className='modal-action m-0 justify-between p-2'>
                <button className='btn btn-circle' aria-label={t('close')} onClick={onClose}>
                  <TbChevronLeft className='icon' />
                </button>
                {/* T-93: named, not wired. This heart has no onClick and never
                    had one - favourites are T-68, blocked on a product
                    decision. A screen reader could already reach it and heard
                    "button"; now it hears what it is. */}
                <button className='btn btn-circle' aria-label={t('favoriteAria')}>
                  <TbHeart className='icon' />
                </button>
              </div>
            </div>
            <h2 className='font-medium text-pretty'>
              {t('errorMessage')}
            </h2>
          </div>
        )}
      </dialog>
    </div>
  );
}

export default memo(ProductModal);
