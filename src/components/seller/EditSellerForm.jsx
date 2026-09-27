'use client';
import { logger } from '@/lib/logger';
import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { localizedHref } from '@/i18n/routing';
import { updateSeller } from '@/services/sellerService';
import InputFields from '@/components/auth/register/InputFields';
import { useRouter } from 'next/navigation';
import Loading from '@/components/general/Loading';
import ToggleSwitch from '@/components/availability/ToggleSwitch';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import ImageGrid from '@/components/general/ImageGrid';
import { useSeller } from '@/context/SellerContext';
import { useCheckSeller } from '@/context/SellerContext';
import UniGraphicSelector from '@/components/university/UniGraphicSelector';
import ProfileChecklist from '@/components/seller/ProfileChecklist';
import { MAX_AVAILABILITY_OVERRIDE_HOURS } from '@/lib/validators/seller';
import { APP_HOME } from '@/lib/app-home';

// T-83: preset durations for "open right now" - short enough that a seller
// who forgets to cancel it isn't stuck marked open for long, and all within
// the API's own cap so a button here can never be rejected by the schema.
const OVERRIDE_PRESET_HOURS = [1, 2, 4].filter(
  hours => hours <= MAX_AVAILABILITY_OVERRIDE_HOURS
);

// T-72: moved out of app/antojos/sellers/profile/edit/page.jsx, which is now a
// Server Component that resolves the checklist and renders this. The form
// itself stays a Client Component - it is all state, effects and handlers.
export default function EditSellerForm({ checklist }) {
  const t = useTranslations('EditSellerForm');
  const locale = useLocale();
  const [sellerAvailability, setSellerAvailability] = useState(false);
  // T-71. Sellers created before this field existed have no `paused` at all -
  // getSellerContextData reads them with .lean(), which skips Mongoose's
  // schema defaults - so this reads `undefined` for them, not `false`.
  const [sellerPaused, setSellerPaused] = useState(false);
  // T-83. Same `.lean()` caveat as `paused`: a seller who never used this
  // reads `undefined`, treated the same as `null` (no override) everywhere
  // below.
  const [overrideUntil, setOverrideUntil] = useState(null);
  const [seller, setSeller] = useState(null);

  const [error, setError] = useState(null);
  const router = useRouter();
  const {
    seller: dataSeller,
    setSeller: setDataSeller,
    loading: sellerLoading,
  } = useSeller();
  const { checkedSeller } = useCheckSeller(
    'sellerApproved',
    '/antojos/sellers/approving'
  );
  useEffect(() => {
    if (!sellerLoading) {
      if (dataSeller) {
        setSeller(dataSeller);
        setSellerAvailability(dataSeller.availability);
        setSellerPaused(Boolean(dataSeller.paused));
        setOverrideUntil(dataSeller.availabilityOverrideUntil ?? null);
      }
    }
  }, [dataSeller, sellerLoading]);

  // T-112b: no getToken() before each write any more - updateSeller is a
  // relative browser fetch and Clerk's session cookie identifies the caller.
  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await updateSeller(seller._id, seller);
      setDataSeller(seller);
      router.push(localizedHref(APP_HOME, locale));
    } catch (error) {
      setError(t('updateError'));
      logger.error(error);
    }
  };
  const handleImagesUpdate = updatedImages => {
    setSeller({ ...seller, logo: updatedImages[0] });
  };

  const handleSellerAvailability = async () => {
    try {
      setSellerAvailability(!sellerAvailability);
      setDataSeller({ ...seller, availability: !sellerAvailability });
      const updatedSeller = await updateSeller(seller._id, {
        availability: !sellerAvailability,
      });
      //if the request is not successful, correct the availability
      if (!updatedSeller) {
        setDataSeller({ ...seller, availability: !sellerAvailability });
        setSellerAvailability(!sellerAvailability);
      }
    } catch (error) {
      logger.error('Error updating seller availability:', error);
    }
  };
  // Optimistic like the availability toggle above, but it rolls back on the
  // catch: updateSeller throws on a non-2xx instead of returning a falsy
  // value, so checking the return (as handleSellerAvailability does) never
  // catches a failed write. Keeps `seller` in sync too, or the next full-form
  // submit would send back the pre-toggle value.
  const handleSellerPaused = async () => {
    const next = !sellerPaused;
    const applyPaused = paused => {
      setSellerPaused(paused);
      setSeller(current => ({ ...current, paused }));
      setDataSeller({ ...seller, paused });
    };

    applyPaused(next);
    try {
      await updateSeller(seller._id, { paused: next });
    } catch (error) {
      applyPaused(!next);
      logger.error('Error updating seller pause mode:', error);
    }
  };

  // T-83. Same optimistic-with-rollback shape as handleSellerPaused: a plain
  // toggle can't represent "how long", so this sends a computed timestamp
  // instead. `null` cancels the window early, e.g. once the seller is
  // actually done for the day.
  const applyOverride = until => {
    setOverrideUntil(until);
    setSeller(current => ({ ...current, availabilityOverrideUntil: until }));
    setDataSeller({ ...seller, availabilityOverrideUntil: until });
  };

  const handleSetOverride = async hours => {
    const previous = overrideUntil;
    const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    applyOverride(until);
    try {
      await updateSeller(seller._id, { availabilityOverrideUntil: until });
    } catch (error) {
      applyOverride(previous);
      logger.error('Error setting extraordinary availability:', error);
    }
  };

  const handleClearOverride = async () => {
    const previous = overrideUntil;

    applyOverride(null);
    try {
      await updateSeller(seller._id, { availabilityOverrideUntil: null });
    } catch (error) {
      applyOverride(previous);
      logger.error('Error clearing extraordinary availability:', error);
    }
  };

  const overrideActive = Boolean(overrideUntil) && new Date(overrideUntil) > new Date();

  if (!checkedSeller || !seller) return <Loading />;
  if (error) return <p>{error}</p>;

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
        <p className='text-white'>
          {t('subtitle')}
        </p>
      </div>
      <div className='h-3/4 bg-[#393939]'>
        <div className='bg-base-100 text-base-content rounded-t-3xl h-max w-full absolute px-6 pt-6 pb-16'>
          <form onSubmit={handleSubmit}>
            <div className='flex flex-col gap-7'>
              <ProfileChecklist checklist={checklist} />

              <div className='flex justify-between items-center gap-4 p-2 bg-base-100 rounded shadow-md'>
                <div>
                  <h3>{t('availabilityHeading')}</h3>
                  <AvailabilityBadge availability={sellerAvailability} />
                </div>
                <ToggleSwitch
                  isOn={sellerAvailability}
                  onToggle={() => handleSellerAvailability()}
                />
              </div>

              {/* T-71. Separate from the availability row above on purpose:
                  that one is today's schedule and the T-14 cron rewrites it
                  on every run, so it can't hold a multi-day absence. The
                  switch tracks visibility (green = listed) rather than the
                  pause itself, to keep the same colour meaning as the toggle
                  right above it. */}
              <div className='flex justify-between items-center gap-4 p-2 bg-base-100 rounded shadow-md'>
                <div className='pr-2'>
                  <h3>{t('visibilityHeading')}</h3>
                  <p
                    className={`text-sm font-semibold ${
                      sellerPaused ? 'text-[#CF0303]' : 'text-[#03CF30]'
                    }`}
                  >
                    {sellerPaused ? t('visibilityPaused') : t('visibilityVisible')}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-base-content/70'>
                    {t('visibilityHint')}
                  </p>
                </div>
                <ToggleSwitch
                  isOn={!sellerPaused}
                  onToggle={() => handleSellerPaused()}
                />
              </div>

              {/* T-83. Separate row from "Mi disponibilidad" above: that one
                  reflects today's Schedule and the T-14 cron overwrites it
                  every run, so it can't hold a bounded exception. This opens
                  the store despite the schedule saying closed, for one of a
                  few preset windows - never with no expiry. */}
              <div className='flex flex-col gap-2 p-2 bg-base-100 rounded shadow-md'>
                <div>
                  <h3>{t('extraordinaryHeading')}</h3>
                  <p className='text-xs text-gray-500 dark:text-base-content/70'>
                    {t('extraordinaryHint')}
                  </p>
                </div>
                {overrideActive ? (
                  <div className='flex justify-between items-center gap-4'>
                    <p className='text-sm font-semibold text-[#03CF30]'>
                      {t('openUntil', {
                        time: new Date(overrideUntil).toLocaleTimeString(
                          locale === 'en' ? 'en-US' : 'es-CO',
                          { hour: '2-digit', minute: '2-digit' }
                        ),
                      })}
                    </p>
                    <button
                      type='button'
                      className='btn btn-sm'
                      onClick={handleClearOverride}
                    >
                      {t('cancel')}
                    </button>
                  </div>
                ) : (
                  <div className='flex gap-2'>
                    {OVERRIDE_PRESET_HOURS.map(hours => (
                      <button
                        key={hours}
                        type='button'
                        className='btn btn-sm'
                        onClick={() => handleSetOverride(hours)}
                      >
                        {t('openForHours', { hours })}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <InputFields
                title={t('nameLabel')}
                type='text'
                placeholder={t('namePlaceholder')}
                value={seller.businessName || ''}
                onChange={e =>
                  setSeller({ ...seller, businessName: e.target.value })
                }
                name='businessName'
                required
              />
               <div>
                <label>{t('universityLabel')}</label>
                <UniGraphicSelector
                  value={seller.university}
                  onUniversityChange={(selected) => setSeller({ ...seller, university: selected })}
                />
              </div>

              <InputFields
                title={t('sloganLabel')}
                type='text'
                placeholder={t('sloganPlaceholder')}
                value={seller.slogan || ''}
                onChange={e => setSeller({ ...seller, slogan: e.target.value })}
                name='slogan'
              />

              <InputFields
                title={t('descriptionLabel')}
                type='textarea'
                name='description'
                placeholder={t('descriptionPlaceholder')}
                value={seller.description || ''}
                onChange={e =>
                  setSeller({ ...seller, description: e.target.value })
                }
              />

              <InputFields
                title={t('instagramLabel')}
                type='text'
                placeholder={t('instagramPlaceholder')}
                value={seller.instagramUser || ''}
                onChange={e =>
                  setSeller({ ...seller, instagramUser: e.target.value })
                }
                name='instagramUser'
              />

              <InputFields
                title={t('phoneLabel')}
                type='tel'
                placeholder={t('phonePlaceholder')}
                value={seller.phoneNumber || ''}
                onChange={e =>
                  setSeller({ ...seller, phoneNumber: e.target.value })
                }
                name='phoneNumber'
                required
              />

              <ImageGrid
                initialImages={seller.logo ? [seller.logo] : []}
                onUpdateImages={handleImagesUpdate}
                nameFolder='sellerlogos'
                title={t('logoTitle')}
                maxImages={1}
              />

              <div className='flex justify-end'>
                <button type='submit' className='btn btn-primary'>
                  {t('saveButton')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
