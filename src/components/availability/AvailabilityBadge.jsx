import React from 'react';
import { availabilityLabel } from '@/lib/store-availability';

// T-122: the product routes send `availabilityStatus` (see
// src/lib/store-availability.ts) and product badges pass it as `status`. The
// seller screens still pass the plain `availability` boolean, which keeps its
// two states.
const TONES = {
  available: 'bg-[#03CF30]/15 text-[#03CF30]',
  off: 'bg-[#CF0303]/15 text-[#CF0303]',
  closed: 'bg-[#ff950b]/15 text-[#c96f00] dark:text-[#ffa733]',
  'no-schedule': 'bg-base-content/10 text-base-content/70',
};

const AvailabilityBadge = ({ availability, status }) => {
  const resolved = status ?? { state: availability ? 'available' : 'off' };

  return (
    <div className='flex items-center space-x-2'>
      <span
        className={`inline-flex items-center justify-center min-w-20 h-[20px] px-2 rounded-md text-[10px] font-semibold whitespace-nowrap transition-colors ${
          TONES[resolved.state]
        }`}
      >
        {availabilityLabel(resolved)}
      </span>
    </div>
  );
};

export default AvailabilityBadge;
