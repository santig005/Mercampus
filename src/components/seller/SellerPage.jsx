'use client';

import { useEffect, useState } from 'react';
import {
  TbChevronLeft,
  TbBrandWhatsapp,
  TbBrandInstagram,
  TbShare2,
} from 'react-icons/tb';
import { useRouter } from 'next/navigation';
import Carousel from '@/components/Carousel';
import TableSchema from '@/components/seller/index/table/TableSchema';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import SellerModal from '@/components/seller/index/SellerModal';
import ProductGrid from '@/components/products/ProductGrid';
import { sendGAEvent } from '@next/third-parties/google';
import ShareButton from '../products/share/ShareButton';
import { parseIfJSON } from '@/utils/utilFn';
import { useUser } from '@clerk/nextjs';

export default function SellerPage({ id }) {
  const [seller, setSeller] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sellerModalId, setSellerModalId] = useState(null);

  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!id) return;

    async function fetchSeller() {
      setLoading(true);
      try {
        const response = await fetch(`/api/sellers/${id}`);
        const data = await response.json();

        if (data.error) {
          console.error('Error fetching seller:', data.error);
          return;
        }

        setSeller(data.seller);
        setSchedules(data.seller.schedules);
        setImages([data.seller.logo]);
      } catch (error) {
        console.error('Error fetching seller:', error);
      }
      setLoading(false);
    }
    fetchSeller();
  }, [id]);

  const handleShowModal = () => {
    document.getElementById('my_modal_1_seller').showModal();
  };

  const handleProtectedContact = (e) => {
    e.preventDefault();
    if (!isLoaded || !user) {
      const currentUrl = `/antojos/sellers/${seller?._id}`;
      router.push(`/auth/login?redirectTo=${encodeURIComponent(currentUrl)}`);
      return;
    }
    const url = e.currentTarget.getAttribute('data-url');
    if (url) window.open(url, '_blank');
  };

  if (!seller) {
    return (
      <div className='fixed inset-0 flex items-center justify-center z-50'>
        <div className='flex justify-center'>
          <span className='loading loading-infinity loading-lg bg-primary-orange'></span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {loading ? (
        <div className='fixed inset-0 flex items-center justify-center z-50'>
          <div className='flex justify-center'>
            <span className='loading loading-infinity loading-lg bg-primary-orange'></span>
          </div>
        </div>
      ) : (
        <dialog id='seller_modal' className='modal modal-top modal-open h-dvh'>
          <ShareButton data={seller} type='seller' />
          {seller ? (
            <>
              <div className='modal-box w-full h-full rounded-none bg-primary p-0 relative'>
                <div className='sticky top-0 left-0'>
                  <div className='absolute w-full z-10'>
                    <div className='modal-action m-0 justify-between p-2'>
                      <button
                        className='btn btn-circle'
                        onClick={() => {
                          router.push('/antojos');
                        }}
                      >
                        <TbChevronLeft className='icon' />
                      </button>
                    </div>
                  </div>
                  <SellerModal seller={sellerModalId} set={setSellerModalId} />
                  {seller && seller.logo && (
                    <Carousel
                      key={seller._id}
                      images={images}
                      _id={seller._id}
                    />
                  )}
                </div>

                <div className='relative h-auto bg-inherit'>
                  <div className='bg-primary rounded-t-3xl w-full absolute -top-8 flex flex-col gap-2 pt-6'>
                    <div className='flex flex-col pb-48 gap-2'>
                      <div className='flex flex-col px-6 gap-1'>
                        <h2 className='text-lg font-semibold break-words'>
                          {seller.businessName}
                        </h2>
                        <AvailabilityBadge availability={seller.availability} />
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
                      <p className='text-[14px] text-secondary px-6 text-balance whitespace-pre-wrap'>
                        {parseIfJSON(seller.description)}
                      </p>
                      <div className=''>
                        <h2 className='card-title px-6'>Horario</h2>
                        {schedules && <TableSchema schedules={schedules} />}
                      </div>
                      <h2 className='card-title px-6 mb-2'>
                        ¡Antojate de algo mas de este vendedor!
                      </h2>
                      <div className='px-2'>
                        <ProductGrid sellerIdParam={seller._id} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className='fixed bottom-0 h-auto w-full'>
                <div className='bg-gray-200 rounded-t-3xl p-4 flex flex-col h-auto justify-center modal-width shadow-2xl shadow-black drop-shadow-2xl'>
                  <div className='flex justify-center items-center h-full'>
                    <div className='flex flex-col justify-between w-full'>
                      <div className='join w-full'>
                        <a
                          href={'#'}
                          data-url={`https://www.instagram.com/_u/${seller.instagramUser}`}
                          className='btn btn-primary border-none join-item w-1/2'
                          onClick={(e) => {
                            handleProtectedContact(e);
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
                          href={'#'}
                          data-url={`https://wa.me/+57${seller.phoneNumber}?text=Hola ${seller.businessName},%20te%20vi%20en%20Mercampus%20`}
                          className='btn btn-primary join-item w-1/2'
                          onClick={(e) => {
                            handleProtectedContact(e);
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
                      <button
                        className='btn btn-secondary w-full mt-2'
                        onClick={handleShowModal}
                      >
                        Recomendar a un amigo <TbShare2 className='icon' />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className=''></div>
          )}
        </dialog>
      )}
    </div>
  );
}
