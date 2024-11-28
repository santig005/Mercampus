import { Montserrat } from 'next/font/google';
import { ClerkLoaded, ClerkLoading, ClerkProvider } from '@clerk/nextjs';

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
  title: 'Mercampus',
  description:
    'Calma tus antojos con Mercampus, un marketplace para universitarios donde podrás comprar y vender tus artículos.',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
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
    </ClerkProvider>
  );
}
