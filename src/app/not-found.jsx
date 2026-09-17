import Link from 'next/link';
import React from 'react';
import { getLocale } from 'next-intl/server';
import { localizedHref } from '@/i18n/routing';

// T-90 (audit findings F1 and F2). The detail pages now call notFound() for an
// id that does not resolve, and without this file that lands on Next's stock
// 404: correct, and still a dead end - no way back except the browser button,
// which is half of what F1 and F2 were actually about.
//
// Product copy stays Spanish (CLAUDE.md), and the whole thing is tokens so it
// follows T-73's palette into dark mode.
export const metadata = {
  title: { absolute: 'Página no encontrada · Mercampus' },
};

export default async function NotFound() {
  // T-81: this file lives outside app/[locale], so there is no `params` to
  // read the locale from - getLocale() reads the one the middleware already
  // negotiated for this request, same as the root layout does. Needed so a
  // 404 reached from /en/about/whatever links back to /en/antojos, not the
  // Spanish URL (which would disagree with the still-English root layout -
  // see src/i18n/routing.ts).
  const locale = await getLocale();

  return (
    <main className='min-h-screen bg-base-100 text-base-content flex items-center justify-center px-6'>
      <div className='flex flex-col items-center gap-4 text-center max-w-md'>
        <p className='text-5xl font-bold text-primary'>404</p>
        <h1 className='text-2xl font-bold'>Esto ya no está aquí</h1>
        <p className='text-base-content/70'>
          El producto o el vendedor que buscas no existe, o dejó de estar
          publicado. Puede que el enlace que te compartieron esté viejo.
        </p>
        <Link href={localizedHref('/antojos', locale)} className='btn btn-primary mt-2'>
          Ver los antojos
        </Link>
      </div>
    </main>
  );
}
