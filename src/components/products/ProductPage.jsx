'use client';

import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import Carousel from '@/components/Carousel';
import TableSchema from '@/components/seller/index/table/TableSchema';
import SellerModal from '@/components/seller/index/SellerModal';
import ShareButton from '@/components/products/share/ShareButton';
import { localizedHref } from '@/i18n/routing';
import { parseIfJSON, priceFormat } from '@/utils/utilFn';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  TbBrandWhatsapp,
  TbChevronLeft,
  TbLoader,
  TbShare2,
} from 'react-icons/tb';

const ProductPage = ({ id, section = 'antojos' }) => {
  const [product, setProduct] = useState(null);
  const [seller, setSeller] = useState({});
  const [schedules, setSchedules] = useState([]);
  const [sellerModalId, setSellerModalId] = useState(null);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('ProductPage');

  useEffect(() => {
    fetchProduct(id);
  }, [id]);

  const fetchProduct = async id => {
    setLoading(true);
    if (id) {
      await fetch(`/api/products/${id}`)
        .then(res => res.json())
        .then(data => {
          setProduct(data);
        });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (product && product.sellerId) {
      setSeller(product.sellerId);
      setSchedules(product.schedules);
    }
  }, [product]);

  const handleShowModal = () => {
    document.getElementById('my_modal_1_product').showModal();
  };

  return (
    <div>
      {loading ? (
        <div className='fixed inset-0 flex items-center justify-center z-50'>
          <div className='flex justify-center'>
            <span className='loading loading-infinity loading-lg bg-primary-orange'></span>
          </div>
        </div>
      ) : (
        <dialog id='product_modal' className='modal modal-top modal-open h-dvh'>
          <ShareButton data={product} type='product' />
          {product ? (
            <>
              {/* T-73: dark:bg-base-100 - ver la nota en Layout.jsx sobre
                  bg-primary (rinde blanco fijo via override en main.css). */}
              <div className='modal-box w-full h-full rounded-none bg-primary dark:bg-base-100 p-0 relative'>
                <div className='sticky top-0 left-0'>
                  <div className='absolute w-full z-10'>
                    <div className='modal-action m-0 justify-between p-2'>
                      <button
                        className='btn btn-circle'
                        aria-label={t('back')}
                        onClick={() => {
                          //document.getElementById('product_modal').close();
                          // T-81: was `router.push(\`/${section}\`)`, dropping
                          // the locale on a soft nav from an English page -
                          // the call site PR #363 missed (see ROADMAP.md
                          // T-81). localizedHref only prefixes /antojos and
                          // /marketplace once they are LOCALIZED_ROUTES
                          // entries, which they now are.
                          router.push(localizedHref(`/${section}`, locale));
                        }}
                      >
                        <TbChevronLeft className='icon' />
                      </button>
                    </div>
                  </div>
                  <SellerModal seller={sellerModalId} set={setSellerModalId} />
                  {product && product.images && (
                    <Carousel
                      key={product._id}
                      images={product.images}
                      _id={product._id}
                    />
                  )}
                </div>

                <div className='relative h-auto bg-inherit'>
                  <div className='bg-primary dark:bg-base-100 rounded-t-3xl w-full absolute -top-8 flex flex-col gap-2 pt-6'>
                    <div className='flex flex-col pb-32 gap-2'>
                      {/* <h2 className='card-title px-6 mt-2'>{product.name}</h2> */}
                      <div className='flex flex-col px-6 gap-1'>
                        <h2 className='text-lg font-semibold break-words'>
                          {product.name}
                        </h2>{' '}
                        {/* <span className='text-4xl mx-2'>•</span> */}
                        <AvailabilityBadge
                          availability={product.availability}
                          status={product.availabilityStatus}
                        />
                      </div>
                      <p className='text-[14px] text-secondary px-6 text-balance whitespace-pre-wrap'>
                        {parseIfJSON(product.description)}
                      </p>
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
                            alt={t('sellerLogoAlt')}
                          />
                        </div>
                        <p className='my-card-subtitle !text-[14px] text-nowrap'>
                          {seller.businessName}
                        </p>
                      </button>
                      <div className=''>
                        <h2 className='card-title px-6'>{t('scheduleHeading')}</h2>
                        {schedules && <TableSchema schedules={schedules} />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className='bg-base-200 text-base-content rounded-t-3xl pt-4 fixed bottom-0 w-full h-auto px-6 shadow-2xl shadow-black drop-shadow-2xl'>
                <div className='flex flex-col h-full justify-center'>
                  <h3 className='font-bold text-lg'>
                    {priceFormat(product.price)}
                  </h3>
                  <div className='py-4'>
                    <a
                      className='btn btn-primary w-full'
                      target='_blank'
                      href={`https://wa.me/+57${encodeURIComponent(
                        seller?.phoneNumber || ''
                      )}?text=${encodeURIComponent(
                        t('whatsappMessage', {
                          seller: seller?.businessName || t('defaultSellerGreeting'),
                          product: product.name,
                        })
                      )}`}
                      aria-label={t('contactWhatsappAria', {
                        seller: seller?.businessName || t('defaultSeller'),
                      })}
                    >
                      {t('contactWhatsapp')}{' '}
                      <TbBrandWhatsapp className='icon' />
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
            // <div className='relative'>
            //   <div className='absolute w-full z-10'>
            //     <div className='modal-action m-0 justify-between p-2'>
            //       <form method='dialog'>
            //         <button className='btn btn-circle'>
            //           <TbChevronLeft className='icon' />
            //         </button>
            //       </form>
            //       <button className='btn btn-circle'>
            //         <TbHeart className='icon' />
            //       </button>
            //     </div>
            //   </div>
            //   <h2 className='font-medium text-pretty'>
            //     Something went wrong, please try again
            //   </h2>
            // </div>
            <div className=''></div>
          )}
        </dialog>
      )}
    </div>
  );
};

export default ProductPage;
