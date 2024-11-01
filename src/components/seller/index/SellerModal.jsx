import React from 'react';
import { TbChevronLeft, TbHeart, TbBrandWhatsapp, TbBrandInstagram } from 'react-icons/tb';
import { FaInstagram } from 'react-icons/fa';
import Carousel from '@/components/Carousel';
import TableSche from '@/components/seller/index/table/TableSche';
import { useEffect, useState } from 'react';


export default function SellerModal({ seller }) {
  const [schedules, setSchedules] = useState([]); // Estado para almacenar los horarios
  useEffect(() => {
    // Función para obtener los horarios del vendedor desde la API
    async function fetchSchedules() {
      try { 
        const response = await fetch(`/api/schedules/${seller._id}`);
        const data = await response.json();
        console.log(data);
        setSchedules(data.schedules);
      } catch (error) {
        console.error('Error fetching schedules:', error);
      }
    }
    fetchSchedules();
  }, [seller._id]);


  return (
    <div>
      <dialog id={seller._id} className='modal modal-bottom'>
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

          <Carousel images={[seller.logo, seller.logo, seller.logo]} _id={seller._id} />

          <div className='relative h-auto w-full'>
            <div className='bg-primary rounded-t-3xl w-full absolute -top-8 flex flex-col gap-2 pt-2'>
              <div className='flex flex-col pb-36 gap-2'>
                <h2 className='card-title px-6'>{seller.businessName}</h2>
                <div className='flex items-center gap-2 px-6'>
                  <div className='rounded-full size-6 overflow-hidden'>
                    <img className='img-full' src={seller.logo} alt={`Logo del vendedor ${seller.businessName}`} />
                  </div>
                  <p className='my-card-subtitle !text-[14px]'>{seller.description}</p>
                </div>
                <p className='text-[14px] text-secondary px-6'>{seller.slogan}</p>
                <div className=''>
                  <h2 className='card-title px-6'>Horario</h2>
                  <TableSche schedules={schedules} />
                </div>
                <div className=''>
                  <h2 className='card-title px-6'>Contacto</h2>
                  <p className='text-[14px] text-secondary px-6'>{seller.phoneNumber}</p>
                  <p className='text-[14px] text-secondary px-6'>{seller.instagramUser}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-gray-200 rounded-t-3xl p-2 fixed bottom-0 w-full h-32 px-6'>
  <div className='flex flex-col h-full justify-center'>
    <p className='py-4'>
      <a href={`https://www.instagram.com/_u/${seller.instagramUser}`} className='btn btn-primary w-full'>
        Contactar por Instagram <FaInstagram className='icon' />
      </a>
    </p>
  </div>
</div>
        <div className='bg-gray-200 rounded-t-3xl p-2 fixed bottom-0 w-full h-32 px-6'>
          <div className='flex flex-col h-full justify-center'>
          <p className='py-4'>
      <a href={`https://www.instagram.com/_u/${seller.instagramUser}`} className='btn btn-primary w-full'>
        Seguir en Instagram <TbBrandInstagram className='icon' />
      </a>
    </p>
            <p className='py-4'>
              <a href={`https://wa.me/+57${seller.phoneNumber}?text=Hola ${seller.businessName},%20te%20vi%20en%20Mercampus%20`} className='btn btn-primary w-full'>
                Contactar por WhatsApp <TbBrandWhatsapp className='icon' />
              </a>
            </p>
          </div>
        </div>
      </dialog>
    </div>
  );
}
