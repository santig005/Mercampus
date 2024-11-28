'use client';

import React, { useState } from 'react';
import AvailabilityBadge from '../availability/AvailabilityBadge';
import Link from 'next/link';

export default function ProductCardFavorite({
  product: { _id: id, name, category, thumbnail, availability },
  isClicked,
  onClick,
}) {
  return (
    <Link
      href={`/antojos/${id}`}
      className={`bg-white drop-shadow-md flex flex-col rounded-md min-w-36 transition-transform duration-300 ${
        isClicked ? 'scale-[0.95]' : 'scale-100'
      }`}
      onClick={onClick}
    >
      <div className='size-24 w-full overflow-hidden rounded-t-md'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className='img-full' src={thumbnail} alt={'Imagen de ' + name} />
      </div>
      <div className='flex flex-col w-full p-2 justify-start'>
        <h2 className='truncate my-card-title'>{name}</h2>
        <h4 className='my-card-subtitle text-primary/70'>{category}</h4>
      </div>
      <AvailabilityBadge availability={availability}></AvailabilityBadge>
    </Link>
  );
}
