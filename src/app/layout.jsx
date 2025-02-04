import { Montserrat } from 'next/font/google';
import { SellerProvider } from '@/context/SellerContext';
import { ClerkLoaded, ClerkLoading, ClerkProvider } from '@clerk/nextjs';
import { esMX } from '@clerk/localizations';

import React from 'react';
import '../../public/css/main.css';
import AnimationProvider from '@/components/AnimationProvider';

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  title: {
    template: 'Mercampus',
    default: 'Mercampus',
  },
  description:
    'Plataforma que conecta estudiantes en la universidad para la compra y venta de alimentos',
  metadataBase: new URL('https://mercampus.vercel.app/'),
  icons: {
    favicon: '/favicon.ico',
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
        url: '/icon512_maskable.png',
        width: 78,
        height: 82,
        alt: 'Mercampus',
      },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      localization={esMX}
      appearance={{
        // baseTheme: dark,
        variables: { colorPrimary: '#FF7622' },
      }}
    >
      <SellerProvider>
      <html lang='es' className={`${montserrat.className} overflow-hidden`}>
        <body className='overflow-hidden bg-primary'>
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
        </body>
      </html>
      </SellerProvider>
    </ClerkProvider>
    
  );
}
