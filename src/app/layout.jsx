import { Montserrat } from 'next/font/google';
import { SellerProvider } from '@/context/SellerContext';
import { UniversityProvider } from '@/context/UniversityContext';
import { ClerkLoaded, ClerkLoading, ClerkProvider } from '@clerk/nextjs';
import { esMX, enUS } from '@clerk/localizations';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import Analytics from '@/utils/analytics';
import { getSellerContextData } from '@/utils/lib/auth';

import React from 'react';
import '../../public/css/main.css';
import AnimationProvider from '@/components/AnimationProvider';
import { titleMetadata } from '@/lib/metadata';

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  // T-76: the template lives in src/lib/metadata.ts. It used to be
  // `template: 'Mercampus'` right here - no `%s`, so it interpolated nothing
  // and flattened any page title to the literal site name.
  title: titleMetadata,
  description:
    'Plataforma que conecta estudiantes en la universidad para la compra y venta de alimentos',
  metadataBase: new URL('https://mercampus.vercel.app/'),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    title: 'Mercampus',
    description:
      'Plataforma que conecta estudiantes en la universidad para la compra y venta de alimentos',
    siteName: 'Mercampus',
    url: 'https://mercampus.vercel.app/',
    images: [
      {
        url: '/android-chrome-512x512.png',
        width: 512,
        height: 512,
        alt: 'Mercampus',
      },
    ],
  },
};

export default async function RootLayout({ children }) {
  // Resolved from the locale negotiated by next-intl's middleware (only for
  // the routes it currently covers, see src/middleware.js) or the
  // NEXT_LOCALE cookie; falls back to 'es' everywhere else, so unmigrated
  // pages keep rendering exactly as before.
  const locale = await getLocale();
  const messages = await getMessages();
  const clerkLocalization = locale === 'en' ? enUS : esMX;
  const { user: initialUser, seller: initialSeller } =
    await getSellerContextData();

  return (
    <ClerkProvider
      localization={clerkLocalization}
      appearance={{
        // baseTheme: dark,
        variables: { colorPrimary: '#FF7622' },
      }}
    >
      <html lang={locale} className={`${montserrat.className} hide-scrollbar`}>
        <head>
          {/* T-73: corre antes de la hidratacion de React para aplicar el
              tema guardado sin un parpadeo claro->oscuro al cargar. No
              puede vivir en un componente: para cuando React monta, el
              primer paint ya paso. El query param ?theme= es un override de
              una sola carga (no se persiste) - pensado para compartir un
              link ya en el tema que se quiere, y es lo que usa
              scripts/lighthouse-dark.mjs para medir el presupuesto de T-61
              contra el tema oscuro sin depender de localStorage. */}
          <script
            dangerouslySetInnerHTML={{
              __html:
                "(function(){try{var q=new URLSearchParams(location.search).get('theme');var t=(q==='dark'||q==='light')?q:localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();",
            }}
          />
        </head>
        <body className='bg-primary'>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <UniversityProvider>
            <SellerProvider initialUser={initialUser} initialSeller={initialSeller}>
              <AnimationProvider>
                <ClerkLoading>
                  <div className='fixed top-0 left-0 z-50 w-full h-full bg-primary flex items-center justify-center'>
                    <div className='flex justify-center'>
                      <span className='loading loading-infinity loading-lg bg-primary-orange'></span>
                    </div>
                  </div>
                </ClerkLoading>
                <ClerkLoaded>{children}</ClerkLoaded>
              </AnimationProvider>
            </SellerProvider>
            </UniversityProvider>
          </NextIntlClientProvider>
        </body>
        <Analytics />
      </html>
    </ClerkProvider>
  );
}
