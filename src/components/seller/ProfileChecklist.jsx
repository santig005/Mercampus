import Link from 'next/link';
import { MdCheckCircle, MdRadioButtonUnchecked } from 'react-icons/md';

// T-72. Pure display, so it stays a Server Component (CLAUDE.md): no state, no
// effects, no handlers. The data comes already derived from
// src/server/sellers/getProfileChecklist.
export default function ProfileChecklist({ checklist }) {
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
          {isComplete ? '¡Tu perfil está completo!' : 'Completa tu perfil'}
        </h3>
        <span className='text-sm text-gray-500 dark:text-base-content/70 whitespace-nowrap'>
          {completed} de {total}
        </span>
      </div>

      {/* progressbar semantics so a screen reader announces the same thing the
          bar shows; the number is in the text above too, not colour-only. */}
      <div
        role='progressbar'
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Perfil completado al ${percent} por ciento`}
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
                    <Link href={item.href} className='text-sm font-medium underline'>
                      {item.label}
                    </Link>
                  ) : (
                    // No href for logo/description: both are fields on this
                    // very form, right below the checklist.
                    <span className='text-sm font-medium'>{item.label}</span>
                  )}
                  <span className='text-xs text-gray-500 dark:text-base-content/70'>
                    {item.hint}
                  </span>
                </div>
              </li>
            ))}
        </ul>
      )}

      {isComplete && (
        <p className='flex items-center gap-2 text-sm text-gray-500 dark:text-base-content/70'>
          <MdCheckCircle className='size-5 shrink-0 text-[#03CF30]' aria-hidden='true' />
          No te falta nada por llenar.
        </p>
      )}
    </section>
  );
}
