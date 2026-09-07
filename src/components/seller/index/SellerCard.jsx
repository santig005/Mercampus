import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import { parseIfJSON } from '@/utils/utilFn';
import React from 'react';
import { sellerCardClassName } from '@/lib/card-variant';

// Same variant rule as ProductCard: 'standalone' (the default) brings its own
// background, shadow and scale animation; 'embedded' leans on the wrapping
// container for that look. The className logic lives in
// src/lib/card-variant.js: see there for why.
export default function SellerCard({
  seller,
  isClicked,
  onClick,
  variant = 'standalone',
}) {
  const { businessName, slogan, description, logo, availability } = seller;

  return (
    <div className={sellerCardClassName({ variant, isClicked })} onClick={onClick}>
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
