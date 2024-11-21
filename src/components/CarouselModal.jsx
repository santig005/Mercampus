'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MdCloseFullscreen } from 'react-icons/md';

export default function CarouselModal({ images, initialIndex, id }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex); // Índice actual
  const carouselRef = useRef(null); // Referencia al contenedor del carrusel

  // Actualizar el índice actual cuando se hace scroll
  const updateCurrentIndex = useCallback(() => {
    const scrollLeft = carouselRef.current.scrollLeft;
    const width = carouselRef.current.offsetWidth;
    const index = Math.round(scrollLeft / width);
    setCurrentIndex(index);
  }, []);

  // Establecer el índice inicial al abrir el modal
  useEffect(() => {
    setCurrentIndex(initialIndex);
    if (carouselRef.current) {
      carouselRef.current.scrollTo({
        left: initialIndex * carouselRef.current.offsetWidth,
        behavior: 'smooth',
      });
    }
  }, [initialIndex]);

  // Escuchar el evento `scroll` en el contenedor del carrusel
  useEffect(() => {
    const carouselElement = carouselRef.current;
    if (!carouselElement) return;

    carouselElement.addEventListener('scroll', updateCurrentIndex);

    return () => {
      carouselElement.removeEventListener('scroll', updateCurrentIndex);
    };
  }, [updateCurrentIndex]);

  return (
    <dialog className='modal backdrop-blur-md p-4' id='carousel_modal'>
      <div className='modal-box p-0 rounded-md h-auto !bg-transparent'>
        {/* Cerrar el modal */}
        <button
          onClick={() => document.getElementById('carousel_modal').close()}
          className='absolute top-4 right-4 text-white text-2xl z-20 bg-white rounded-full p-1'
        >
          <MdCloseFullscreen className='text-black' />
        </button>
        {/* Indicadores */}
        {images.length > 1 && (
          <div className='absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-10'>
            {images.map((_, index) => (
              <button
                key={id + '-indicator-' + index}
                className={`w-3 h-3 rounded-full ${
                  index === currentIndex ? 'bg-primary-orange' : 'bg-gray-400'
                }`}
              ></button>
            ))}
          </div>
        )}

        {/* Contenedor del carrusel */}
        <div
          ref={carouselRef}
          className='carousel w-full overflow-x-scroll snap-x snap-mandatory scroll-smooth flex max-h-[calc(100dvh-40px)]'
        >
          {images.map((image, index) => (
            <div
              key={id + index}
              className='carousel-item w-full h-auto flex-shrink-0 snap-center'
            >
              <img
                src={image}
                className='w-full h-full object-center object-cover'
                alt={`Carousel image ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Fondo para cerrar el modal */}
      <form method='dialog' className='modal-backdrop'>
        <button>close</button>
      </form>
    </dialog>
  );
}
