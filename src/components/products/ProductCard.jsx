/* eslint-disable @next/next/no-img-element */
import React from 'react';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import { priceFormat } from '@/utils/utilFn';
import { productCardClassName } from '@/lib/card-variant';

// variant='standalone' (por defecto): tarjeta suelta sobre el fondo de la
// página, con su propio sombreado y la animación de escala al hacer click.
// variant='embedded': sin fondo ni sombreado, para cuando el contenedor que la
// envuelve ya provee esa apariencia (p. ej. la fila de edición de productos).
// La lógica del className vive en src/lib/card-variant.js: ver ahí por qué.
export default function ProductCard({ product, isClicked, variant = 'standalone' }) {
  const { name, availability, category, price, images, owner } = product;

  const renderCategories = () => {
    try {
      return category.map((cat, index) => (
        <span
          key={index}
          className='my-card-subtitle text-[11px] mr-1 px-1 py-[2px] rounded-md bg-[#ff950b]/15'
        >
          {cat}
        </span>
      ));
    } catch (error) {
      return <span className='my-card-subtitle'>{category}</span>;
    }
  };

  return (
    <div className={productCardClassName({ variant, isClicked })}>
      <div className='h-24 w-32 rounded-md overflow-hidden flex-shrink-0'>
        <img className='img-full' src={images[0]} alt={'Imagen de ' + name} />
      </div>
      <div className='flex flex-col justify-between'>
        <h2 className='my-card-title truncate w-60 block'>{name}</h2>
        <div className='my-card-subtitle truncate w-60 block text-primary/90'>
          {renderCategories()}
        </div>
        <p className='card-price'>{priceFormat(price)}</p>
        <div className='flex items-center gap-2'>
          <p className='my-card-subtitle'>{owner}</p>
        </div>
        <AvailabilityBadge availability={availability}></AvailabilityBadge>
      </div>
    </div>
  );
}
