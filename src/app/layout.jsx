import { Montserrat } from 'next/font/google';

import React from 'react';
import '../../public/css/main.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600', '700'],
});

export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  // Also supported by less commonly used
  interactiveWidget: 'resizes-visual',
};

export const metadata = {
  title: 'Mercampus',
  description:
    'Calma tus antojos con Mercampus, un marketplace para universitarios donde podrás comprar y vender tus artículos.',
};

export default function RootLayout({ children }) {
  return (
    <html lang='es' className={montserrat.className}>
      <body className='overflow-hidden bg-primary'>{children}</body>
    </html>
  );
}
