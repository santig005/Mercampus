import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import { parseIfJSON } from '@/utils/utilFn';
import React from 'react';

export default function SellerCard({
  seller: {
    _id: id,
    businessName,
    slogan,
    description,
    logo,
    instagramUser,
    availability,
    phoneNumber,
    userId,
  },
  isClicked,
  onClick,
}) {
  return (
    <div
      // href={`/sellers/${id}`}
      className={`bg-white drop-shadow-md flex gap-2 p-2 rounded-md transition-transform duration-300 cursor-pointer ${
        isClicked ? 'scale-[0.95]' : 'scale-100'
      }`}
      onClick={onClick}
    >
      <div className='size-24 rounded-md overflow-hidden aspect-square'>
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
        {/* <div className='flex items-center gap-2'>
          <div className='rounded-full size-6 overflow-hidden'>
            <img
              className='img-full'
              src={logo}
              alt={'Logo del vendedor ' + businessName}
            />
          </div>
          <p className='my-card-subtitle'>{instagramUser}</p>
        </div> */}
        <AvailabilityBadge availability={availability}></AvailabilityBadge>
      </div>
    </div>
  );
}
