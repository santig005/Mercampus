'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import { DAY_KEYS, daysES } from '@/utils/resources/days';

// T-81 (seller profile zone): flagged as a gap by the product detail zone's
// own PR (rule 9) - this table renders on both the (already migrated)
// product page and this (now migrated) seller profile, so it was leaking
// Spanish headers and day names into /en/antojos/<id> too.
//
// `schedule.day` does not arrive as the raw 1-7 stored on the Schedule
// document - GET /api/sellers/[id] and getSchedulesBySeller's withDayNames()
// (src/utils/lib/schedules.ts) both swap it for its Spanish name via `daysES`
// before this component ever sees it, for the seller's own edit screens
// (Schedule.jsx) that are not migrated yet. Translating it here means
// reversing that lookup (`daysES.indexOf`) instead of a locale-agnostic index
// - a real seam, not a design choice made here. Left as-is rather than
// changing the API response shape, which those unmigrated screens also read.
export default function TableSchema({ schedules }) {
  const t = useTranslations('TableSchema');

  const dayLabel = (day) => {
    const index = daysES.indexOf(day);
    return index === -1 ? day : t(`days.${DAY_KEYS[index]}`);
  };

  return (
    <div className='overflow-x-auto hide-scrollbar'>
      {/* T-73: dark:bg-base-100 - ver la nota en Layout.jsx sobre bg-primary
          (rinde blanco fijo via override en main.css); esta tabla vive
          siempre dentro del bg-primary/dark:bg-base-100 de ProductModal o
          SellerModal, asi que tiene que seguirle el mismo tono. */}
      <table className='table table-zebra text-nowrap bg-primary dark:bg-base-100'>
        {/* Head */}
        <thead>
          <tr>
            <th>{t('dayHeader')}</th>
            <th>{t('startTimeHeader')}</th>
            <th>{t('endTimeHeader')}</th>
          </tr>
        </thead>
        <tbody className='!bg-primary/10'>
          {Array.isArray(schedules) && schedules.length > 0 ? (
            schedules.map((schedule, index) => (
              <tr key={index}>
                <td>{dayLabel(schedule.day)}</td>
                <td>{schedule.startTime}</td>
                <td>{schedule.endTime}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan='3' className='text-center'>
                {t('empty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
