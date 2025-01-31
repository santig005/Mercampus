/* eslint-disable @next/next/no-img-element */
import React from 'react';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import { priceFormat } from '@/utils/utilFn';

export default function ProductCard({
  product: { _id: id, name, availability, category, price, thumbnail, owner },
  isClicked,
}) {
  return (
    <div
      className={`bg-white drop-shadow-md flex gap-2 p-2 rounded-md transition-transform duration-300 cursor-pointer ${
        isClicked ? 'scale-[0.95]' : 'scale-100'
      }`}
    >
      <div className='size-24 w-32 rounded-md overflow-hidden'>
        <img className='img-full' src={thumbnail} alt={'Imagen de ' + name} />
      </div>
      <div className='flex flex-col justify-between'>
        <h2 className='my-card-title truncate w-60 block'>{name}</h2>
        <h4 className='my-card-subtitle text-primary/70'>{category}</h4>
        <p className='card-price'>{priceFormat(price)}</p>
        {/* <div className='flex items-center gap-2'>
          <div className='rounded-full size-6 overflow-hidden'>
            <img
              className='img-full'
              src={thumbnail}
              alt={'Imagen del publicador del producto ' + name}
            />
          </div>
          <p className='my-card-subtitle'>{owner}</p>
        </div> */}
        <AvailabilityBadge availability={availability}></AvailabilityBadge>
      </div>
    </div>
  );
}
