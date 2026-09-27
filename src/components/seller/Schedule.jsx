import { logger } from '@/lib/logger';
import 'daisyui';
import { daysOfWeekES } from '@/utils/resources/days';
import { getSchedules } from '@/services/scheduleService';
import React, { useState, useEffect } from 'react';
import { useSeller } from '@/context/SellerContext';
import { useCheckSeller } from '@/context/SellerContext';
import Loading from '../general/Loading';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { localizedHref } from '@/i18n/routing';

// T-81 (seller profile/schedule zone): `schedule.day` is stored (and this
// screen's own <select> reads/writes) the Spanish day *name* from
// `daysOfWeekES` - the same shape the seller profile zone's PR flagged as a
// real, deliberately unfixed seam (TableSchema receiving `daysES[day - 1]`
// from the server). Translating that properly means the day picker itself
// storing/reading a locale-agnostic value (see DAY_KEYS in
// src/utils/resources/days.js) and every consumer of Schedule.day - this
// screen, the two API routes, TableSchema, SellerModal, ProductModal -
// agreeing on the new shape. Out of scope here for the same reason it was
// out of scope there: it changes a response/storage shape read by more than
// this screen. The day names in the picker below stay Spanish in both
// locales; everything else on this screen is translated.
const Schedule = () => {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Schedule');
  const [schedules, setSchedules] = useState([
    { id: null, day: '', startTime: '', endTime: '' },
  ]);
  const [errorBanner, setErrorBanner] = useState(null);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);

  // Get seller data and loading state from the context
  const { seller, loading: sellerLoading } = useSeller();
  const { checkedSeller } = useCheckSeller(
    'sellerApproved',
    '/antojos/sellers/approving'
  );

  // Once the seller context is done loading, check if we have a valid seller
  useEffect(() => {
    if (!sellerLoading) {
      const fetchSchedules = async () => {
        if (!seller) return;
        try {
          const response = await getSchedules(seller._id);
          const mappedSchedules = response.schedules.map(schedule => ({
            id: schedule._id,
            day: schedule.day,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          }));
          setSchedules(mappedSchedules);
        } catch (error) {
          logger.error('Error fetching schedules:', error);
        } finally {
          setIsLoadingSchedules(false);
        }
      };
      fetchSchedules();
    }
  }, [seller, sellerLoading, router]);
  if (!checkedSeller || isLoadingSchedules) return <Loading />;

  const handleAddSchedule = () => {
    setSchedules([
      ...schedules,
      { id: null, day: '', startTime: '', endTime: '' },
    ]);
  };

  const handleScheduleChange = (index, field, value) => {
    const updatedSchedules = schedules.map((schedule, i) =>
      i === index ? { ...schedule, [field]: value } : schedule
    );
    setSchedules(updatedSchedules);
    setErrorBanner(null); // Reset error banner on change
  };

  const validateSchedules = () => {
    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      const startHour = parseInt(schedule.startTime.split(':')[0]);
      const endHour = parseInt(schedule.endTime.split(':')[0]);
      const startMinutes = parseInt(schedule.startTime.split(':')[1]);
      const endMinutes = parseInt(schedule.endTime.split(':')[1]);

      if (!schedule.day) {
        setErrorBanner(t('errorSelectDay', { index: i + 1 }));
        return false;
      }

      if (!schedule.startTime || !schedule.endTime) {
        setErrorBanner(t('errorBothTimes', { index: i + 1 }));
        return false;
      }

      if (startHour < 6) {
        setErrorBanner(t('errorStartTime', { index: i + 1 }));
        return false;
      }

      if (endHour > 21 || (endHour === 21 && endMinutes > 0)) {
        setErrorBanner(t('errorEndTime', { index: i + 1 }));
        return false;
      }

      if (
        endHour < startHour ||
        (endHour === startHour && endMinutes <= startMinutes)
      ) {
        setErrorBanner(t('errorEndAfterStart', { index: i + 1 }));
        return false;
      }
    }
    return true;
  };

  const handleRemoveSchedule = index => {
    const updatedSchedules = schedules.filter((_, i) => i !== index);
    setSchedules(updatedSchedules);
  };

  const handlePrintSchedules = async () => {
    const payload = {
      sellerId: seller._id,
      schedules: schedules,
    };
    if (validateSchedules()) {
      setErrorBanner(null); // Clear error banner if validation passes
      try {
        const response = await fetch('/api/schedules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (response.ok) {
          logger.debug('Schedules printed successfully');
          // T-81: this screen has no [locale] segment of its own, but on an
          // English page a bare push('/antojos') would land on the Spanish
          // URL while the root layout - frozen across client-side
          // navigation - keeps rendering English (see src/i18n/routing.ts).
          router.push(localizedHref('/antojos', locale));
        } else {
          const errorData = await response.json();
          logger.error('Error saving schedules:', errorData.message);
          setErrorBanner(errorData.message);
        }
      } catch (error) {
        logger.error('Error making the request:', error);
        setErrorBanner(t('connectionError'));
      }
    }
  };

  return (
    <div className='flex flex-col h-dvh relative'>
      <div
        id='register-bg'
        className={`h-1/4 bg-[#393939] flex flex-col justify-center items-center sticky top-0 left-0 overflow-hidden`}
      >
        {/* <Link href='/' className='btn btn-circle absolute top-4 left-4'>
            <TbChevronLeft className='icon' />
          </Link> */}
        <h2 className='text-2xl font-semibold text-white'>{t('heading')}</h2>
        <p className='text-white text-center'>
          {t('subtitle')}
        </p>
      </div>

      <div className='h-3/4 bg-[#393939]'>
        <div className='bg-base-100 text-base-content rounded-t-3xl min-h-dvh h-max w-full absolute px-6 pt-6 pb-16'>
          <div className='p-6'>
            <h1 className='text-xl font-bold mb-4'>{t('yourSchedulesHeading')}</h1>
            <h2>{t('intro')}</h2>
            <p className='mt-4 font-semibold'>{t('keepInMind')}</p>
            <ul className='list-decimal mb-4'>
              <li>
                {t('tip1Before')}{' '}
                <span className='text-white bg-gray-800 rounded-md p-1 text-nowrap'>
                  6:00 am
                </span>{' '}
                {t('tip1Between')}{' '}
                <span className='text-white bg-gray-800 rounded-md p-1 text-nowrap'>
                  9:00 pm
                </span>{' '}
                {t('tip1After')}
              </li>
              <li>{t('tip2')}</li>
            </ul>
            {errorBanner && (
              <div className='alert alert-error mb-4'>{errorBanner}</div>
            )}
            {schedules.map((schedule, index) => (
              <div
                key={index}
                className='flex flex-col md:flex-row items-center gap-2 mb-4'
              >
                <div className='flex gap-2 w-full md:w-auto'>
                  <select
                    className='select select-bordered w-full md:w-40'
                    value=''
                    onChange={e =>
                      handleScheduleChange(index, 'day', e.target.value)
                    }
                  >
                    <option value=''>{schedule.day || ''}</option>
                    {daysOfWeekES.map(day => (
                      <option key={day.id} value={day.name}>
                        {day.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className='btn btn-error btn-sm ml-2'
                    onClick={() => handleRemoveSchedule(index)}
                  >
                    {t('removeButton')}
                  </button>
                </div>
                <div className='flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto'>
                  <div className='flex items-center gap-2'>
                    <label className='text-sm font-medium text-gray-600 dark:text-base-content/70'>
                      {t('startTimeLabel')}
                    </label>
                    <input
                      type='time'
                      className='input input-bordered w-full md:w-24'
                      value={schedule.startTime}
                      onChange={e =>
                        handleScheduleChange(index, 'startTime', e.target.value)
                      }
                    />
                  </div>
                  <div className='flex items-center gap-2'>
                    <label className='text-sm font-medium text-gray-600 dark:text-base-content/70'>
                      {t('endTimeLabel')}
                    </label>
                    <input
                      type='time'
                      className='input input-bordered w-full md:w-24'
                      value={schedule.endTime}
                      onChange={e =>
                        handleScheduleChange(index, 'endTime', e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className='flex gap-4'>
              <button className='btn btn-primary' onClick={handleAddSchedule}>
                {' '}
                {t('addScheduleButton')}
              </button>
              <button
                className='btn btn-secondary'
                onClick={handlePrintSchedules}
              >
                {t('saveSchedulesButton')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
