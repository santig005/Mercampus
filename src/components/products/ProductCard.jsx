import React from 'react';
import { Link } from 'next-view-transitions';

export default function ProductCard({
  product: { _id: id, name, category, price, thumbnail, owner },
  isClicked,
  onClick,
}) {
  return (
    <div
      // href={`/antojos/${id}`}
      className={`bg-white drop-shadow-md flex gap-2 p-2 rounded-md transition-transform duration-300 cursor-pointer ${
        isClicked ? 'scale-[0.95]' : 'scale-100'
      }`}
      onClick={onClick}
    >
      <div className='size-24 w-32 rounded-md overflow-hidden'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className='img-full' src={thumbnail} alt={'Imagen de ' + name} />
      </div>
      <div className='flex flex-col justify-between'>
        <h2 className='my-card-title text-pretty'>{name}</h2>
        <h4 className='my-card-subtitle text-primary/70'>{category}</h4>
        <p className='card-price'>${price}</p>
        <div className='flex items-center gap-2'>
          <div className='rounded-full size-6 overflow-hidden'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className='img-full'
              src={thumbnail}
              alt={'Imagen del publicador del producto ' + name}
            />
          </div>

          <p className='my-card-subtitle'>{owner}</p>
        </div>
      </div>
    </div>
  );
}
