import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import { parseIfJSON } from '@/utils/utilFn';
import React from 'react';

export default function SellerCardAV({
  seller: { id: _id, businessName, slogan, description, logo, availability },
  isClicked,
  onClick,
}) {
  return (
    <div
      // href={`/sellers/${id}`}
      className={'flex gap-2 p-2 rounded-md w-full cursor-pointer'}
      onClick={onClick}
    >
      <div className='size-24 rounded-md overflow-hidden aspect-square flex-shrink-0'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className='img-full' src={logo} alt={'Logo de ' + businessName} />
      </div>
      <div className='flex flex-col justify-between'>
        <h2 className='my-card-title text-pretty m-0 p-0 truncate w-60'>
          {businessName}
        </h2>
        <p className='card-description text-sm truncate w-60'>
          {parseIfJSON(description)}
        </p>
        <h4 className='my-card-subtitle text-primary/70 m-0 p-0 truncate w-60'>
          {slogan}
        </h4>
        <AvailabilityBadge availability={availability}></AvailabilityBadge>
      </div>
    </div>
  );
}
