/* eslint-disable @next/next/no-img-element */
import React from 'react';

export default function TutorCard({ tutor }) {

  const renderSubjects = () => {
    try {
      return tutor.subjects.map((subject, index) => (
        <span
          key={index}
          className='my-card-subtitle text-[11px] mr-1 px-1 py-[2px] rounded-md bg-[#ff950b]/15'
        >
          {subject}
        </span>
      ));
    } catch (error) {
      return <span className='my-card-subtitle'>{tutor.subjects}</span>;
    }
  };

  return (
    <div
      className='bg-white drop-shadow-md flex items-center gap-2 p-2 rounded-md transition-transform duration-300 cursor-pointer h-full'
    >
      <div className='size-24 w-32 rounded-md overflow-hidden flex-shrink-0'>
        <img className='img-full' src={tutor.photo || '/images/default-pfp.png'} alt={'Foto de ' + tutor.tutorName} />
      </div>
      <div className='flex flex-col justify-between'>
        <h2 className='my-card-title truncate w-60 block'>{tutor.tutorName}</h2>
        {/* Contenedor corregido para permitir el ajuste de línea */}
        <div className='my-card-subtitle flex flex-wrap gap-y-1'>
          {renderSubjects()}
        </div>
        <p className='my-card-subtitle'>{tutor.university}</p>
      </div>
    </div>
  );
}
