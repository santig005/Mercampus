'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import { formatOpeningTime } from '@/lib/store-availability';
import { DAY_KEYS } from '@/utils/resources/days';

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

// T-81 (seller profile zone): the four labels used to come from
// `availabilityLabel()` in src/lib/store-availability.ts, hardcoded to
// Spanish - flagged as a gap by the product detail zone's own PR (rule 9),
// since this badge renders on both the (already migrated) product page and
// this (now migrated) seller profile. The wording itself is unchanged, just
// moved into messages/{es,en}.json under this component's own namespace, so
// /en/antojos/sellers/<id> and /en/antojos/<id> both read English here.
const AvailabilityBadge = ({ availability, status }) => {
  const t = useTranslations('AvailabilityBadge');
  const resolved = status ?? { state: availability ? 'available' : 'off' };

  const label = () => {
    switch (resolved.state) {
      case 'available':
        return t('available');
      case 'off':
        return t('off');
      case 'no-schedule':
        return t('noSchedule');
      case 'closed': {
        const { day, startTime } = resolved.nextOpening;
        const { hour, minute } = formatOpeningTime(startTime);
        return t('closed', { day: t(`days.${DAY_KEYS[day - 1]}`), hour, minute });
      }
    }
  };

  return (
    <div className='flex items-center space-x-2'>
      <span
        className={`inline-flex items-center justify-center min-w-20 h-[20px] px-2 rounded-md text-[10px] font-semibold whitespace-nowrap transition-colors ${
          TONES[resolved.state]
        }`}
      >
        {label()}
      </span>
    </div>
  );
};

export default AvailabilityBadge;
