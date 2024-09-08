import React from 'react';

export default function ProductCardFavorite({
  product: { name, category, thumbnail },
}) {
  return (
    <div className='bg-white drop-shadow-md flex flex-col gap-2 p-2 rounded-md w-36'>
      <div className='size-24 w-full rounded-md overflow-hidden'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className='img object-cover w-full h-full'
          src={thumbnail}
          alt={'Imagen de ' + name}
        />
      </div>
      <div className='flex flex-col justify-between overflow-hidden'>
        <h2 className='card-title'>{name}</h2>
        <h4 className='card-subtitle text-secondary'>{category}</h4>
      </div>
    </div>
  );
}
