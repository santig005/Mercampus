'use client';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md';
import { localizedHref } from '@/i18n/routing';

// T-72. Pure display - no state or effects of its own, only the `useLocale`/
// `useTranslations` hooks that make it 'use client' (T-81: it renders inside
// EditSellerForm, itself a Client Component, so importing it there needs the
// directive regardless - same shape as AvailabilityBadge/TableSchema).
//
// T-81 (seller profile/schedule zone): `label`/`hint` used to live on the
// checklist item itself (src/lib/profile-completeness.ts), hardcoded Spanish
// - moved here, keyed by `item.id`, under messages/{es,en}.json's
// `ProfileChecklist.items.*`. That file stays pure data (id/done/href), which
// is also what its own unit tests already asserted on.
export default function ProfileChecklist({ checklist }) {
  const t = useTranslations('ProfileChecklist');
  const locale = useLocale();

  // No seller resolved server-side (visitor, or a session without a seller
  // profile): the client form redirects them, so render nothing here.
  if (!checklist) return null;

  const { items, completed, total, percent } = checklist;
  const isComplete = completed === total;

  return (
    <section
      aria-labelledby='profile-checklist-heading'
      className='p-4 bg-base-100 text-base-content rounded shadow-md flex flex-col gap-3'
    >
      <div className='flex items-center justify-between gap-4'>
        <h3 id='profile-checklist-heading' className='font-semibold'>
          {isComplete ? t('completeHeading') : t('incompleteHeading')}
        </h3>
        <span className='text-sm text-gray-500 dark:text-base-content/70 whitespace-nowrap'>
          {t('progress', { completed, total })}
        </span>
      </div>

      {/* progressbar semantics so a screen reader announces the same thing the
          bar shows; the number is in the text above too, not colour-only. */}
      <div
        role='progressbar'
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('progressAria', { percent })}
        className='h-2 w-full rounded-full bg-base-200 overflow-hidden'
      >
        <div
          className='h-full bg-primary-orange transition-[width] duration-300'
          style={{ width: `${percent}%` }}
        />
      </div>

      {!isComplete && (
        <ul className='flex flex-col gap-2'>
          {items
            .filter(item => !item.done)
            .map(item => (
              <li key={item.id} className='flex items-start gap-2'>
                <MdRadioButtonUnchecked
                  className='size-5 shrink-0 mt-0.5 text-gray-400 dark:text-base-content/70'
                  aria-hidden='true'
                />
                <div className='flex flex-col'>
                  {item.href ? (
                    <Link
                      href={localizedHref(item.href, locale)}
                      className='text-sm font-medium underline'
                    >
                      {t(`items.${item.id}.label`)}
                    </Link>
                  ) : (
                    // No href for logo/description: both are fields on this
                    // very form, right below the checklist.
                    <span className='text-sm font-medium'>
                      {t(`items.${item.id}.label`)}
                    </span>
                  )}
                  <span className='text-xs text-gray-500 dark:text-base-content/70'>
                    {t(`items.${item.id}.hint`)}
                  </span>
                </div>
              </li>
            ))}
        </ul>
      )}

      {isComplete && (
        <p className='flex items-center gap-2 text-sm text-gray-500 dark:text-base-content/70'>
          <MdCheckCircle className='size-5 shrink-0 text-[#03CF30]' aria-hidden='true' />
          {t('allDone')}
        </p>
      )}
    </section>
  );
}
