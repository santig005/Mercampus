'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import '../../public/css/main.css';

// T-60: this replaces the ENTIRE document (html/body included) when an
// error escapes the root layout, so it can't rely on anything that layout
// normally provides - no ClerkProvider, no next-intl - and re-imports the
// global stylesheet directly for the same reason. Spanish, like the rest of
// the product copy a student sees (CLAUDE.md); this one screen isn't worth
// wiring into next-intl given how rarely it should ever render.
export default function GlobalError({ error }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang='es'>
      <body className='bg-base-100 text-base-content'>
        <main className='min-h-screen flex items-center justify-center px-6'>
          <div className='flex flex-col items-center gap-4 text-center max-w-md'>
            <p className='text-5xl font-bold text-primary'>Ups</p>
            <h1 className='text-2xl font-bold'>Algo salió mal</h1>
            <p className='text-base-content/70'>
              Hubo un error inesperado. Intenta recargar la página; si sigue
              pasando, ya quedó registrado para revisarlo.
            </p>
            <button
              type='button'
              onClick={() => window.location.reload()}
              className='btn btn-primary mt-2'
            >
              Recargar
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
