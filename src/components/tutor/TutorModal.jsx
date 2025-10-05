/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { IoClose } from 'react-icons/io5';
import { FaUniversity } from 'react-icons/fa';
import { TbBrandWhatsapp } from 'react-icons/tb';

export default function TutorModal({ tutor, onClose }) {
  if (!tutor) return null;

  const renderSubjects = () => {
    return tutor.subjects?.map((subject, index) => (
      <span
        key={index}
        className='text-sm font-semibold mr-2 px-3 py-1 rounded-full bg-orange-100 text-orange-800'
      >
        {subject}
      </span>
    ));
  };

  const whatsappMessage = encodeURIComponent(
    `Hola ${tutor.tutorName}, te vi en Mercampus y estoy interesado en una tutoría.`
  );

  return (
    <dialog id='tutor_modal' className='modal modal-open'>
      <div className='modal-box p-0 max-w-lg rounded-lg'>
        <div className='relative'>
          <img
            src={tutor.photo || '/images/default-pfp.png'}
            alt={`Foto de ${tutor.tutorName}`}
            className='w-full h-56 object-cover rounded-t-lg'
          />
          <button
            onClick={onClose}
            className='btn btn-circle btn-ghost btn-sm absolute top-2 right-2 bg-white/70 hover:bg-white'
          >
            <IoClose className='text-xl' />
          </button>
        </div>
        <div className='p-6'>
          <h2 className='text-3xl font-bold mb-2 text-gray-800'>{tutor.tutorName}</h2>
          <p className='text-gray-600 mb-4'>{tutor.description}</p>
          
          <div className='flex items-center text-gray-700 mb-4'>
            <FaUniversity className='mr-3 text-lg text-primary' />
            <span>{tutor.university}</span>
          </div>

          <div className='mb-4'>
            <h3 className='font-semibold text-lg text-gray-800 mb-2'>Materias</h3>
            <div className='flex flex-wrap gap-2'>
              {renderSubjects()}
            </div>
          </div>
          
          <a
            href={`https://wa.me/57${tutor.phoneNumber}?text=${whatsappMessage}`}
            target='_blank'
            rel='noopener noreferrer'
            className='btn w-full mt-4 text-white bg-green-500 hover:bg-green-600'
          >
            Contactar por WhatsApp <TbBrandWhatsapp className='icon' />
          </a>
        </div>
      </div>
      {/* Cierra el modal al hacer clic fuera */}
      <form method='dialog' className='modal-backdrop'>
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}
