import React from 'react';

export default function ProductCard({
  product: { name, category, price, thumbnail, owner },
}) {
  return (
    <div className='bg-white drop-shadow-md flex gap-2 p-2 rounded-md'>
      <div className='size-24 w-32 rounded-md overflow-hidden'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className='img object-cover w-full h-full'
          src={thumbnail}
          alt={'Imagen de ' + name}
        />
      </div>
      <div className='flex flex-col justify-between'>
        <h2 className='card-title'>{name}</h2>
        <h4 className='card-subtitle text-secondary'>{category}</h4>
        <p className='card-price'>${price}</p>
        <div className='flex items-center gap-2'>
          <div className='rounded-full size-6 overflow-hidden'>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className='img object-cover w-full h-full'
              src={thumbnail}
              alt={'Imagen del publicador del producto ' + name}
            />
          </div>

          <p className='card-subtitle'>{owner}</p>
        </div>
      </div>
    </div>
  );
}
