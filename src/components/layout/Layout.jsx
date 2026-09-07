import Navbar from '@/components/header/Navbar';
import React from 'react';

export default function Layout({ children }) {
  return (
    <div className='h-[calc(100dvh-0px)] bg-transparent'>
      {/* T-73: sin dark:bg-base-200 aca, la fila del header quedaria
          transparente sobre el bg-primary de <body> (que NO se toca, ver
          nota abajo) - blanco fijo justo encima del contenido ya oscuro.
          Le suma el mismo tono para que header y contenido sigan viendose
          como una sola superficie, igual que hoy en claro. */}
      <div className='h-16 w-full flex items-start justify-between p-2 dark:bg-base-200'>
        <Navbar />
      </div>
      {/* bg-primary aca NO es el naranja de marca - public/css/main.css
          define `.bg-primary { @apply bg-[#f8f8f8]; }`, un override fijo
          que gana por orden de cascada y hace que TODO bg-primary del sitio
          rinda un blanco casi puro, en cualquier tema (bg-primary-orange,
          mas abajo en ese mismo archivo, es la clase separada que sí usa el
          naranja real). No se toca ese comportamiento en claro - foto exacta
          de como se ve hoy - ni el de <body> en layout.jsx, que es global a
          todo el sitio (admin/auth incluidos) y no tiene el switcher. Pero
          en oscuro esta superficie puntual necesita su propio tono o el
          lienzo entero de este listado queda blanco brillante detras de
          tarjetas oscuras. dark:bg-base-200 es seguro aca porque Layout solo
          lo usan antojos/layout.jsx y marketplace/layout.jsx (ver ese
          archivo) - no se filtra a paginas no migradas fuera de esas dos. */}
      <div className='bg-primary dark:bg-base-200 h-[calc(100dvh-64px)] rounded-md overflow-y-scroll overflow-x-hidden pb-4 hide-scrollbar'>
        <div className='container mx-auto'>{children}</div>
      </div>
    </div>
  );
}
