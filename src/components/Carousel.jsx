'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function Carousel({ images, _id: id }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef(null);

  const updateCurrentIndex = () => {
    const scrollLeft = carouselRef.current.scrollLeft; // Scroll horizontal actual
    const width = carouselRef.current.offsetWidth; // Ancho visible del contenedor
    const index = Math.round(scrollLeft / width); // Índice basado en posición
    setCurrentIndex(index);
  };

  useEffect(() => {
    const carouselElement = carouselRef.current;
    if (!carouselElement) return;

    // Escuchar el evento de scroll
    carouselElement.addEventListener('scroll', updateCurrentIndex);

    // Limpieza
    return () => {
      carouselElement.removeEventListener('scroll', updateCurrentIndex);
    };
  }, []);

  useEffect(() => {
    // Restablecer al índice 0 si las imágenes cambian
    setCurrentIndex(0);
  }, [images]);

  return (
    <div className='relative w-full h-80'>
      {/* Indicators */}
      <div className='absolute bottom-10 left-1/2 transform -translate-x-1/2 flex gap-2 z-20'>
        {images.map((_, index) => (
          <button
            key={id + '-indicator-' + index}
            className={`w-3 h-3 rounded-full ${
              index === currentIndex ? 'bg-primary-orange' : 'bg-gray-400'
            }`}
          ></button>
        ))}
      </div>

      {/* Carousel Container */}
      <div
        ref={carouselRef}
        className='carousel w-full h-full overflow-x-scroll snap-x snap-mandatory scroll-smooth relative'
      >
        <div className='flex'>
          {images.map((image, index) => (
            <div
              key={id + index}
              className='carousel-item w-full flex-shrink-0 h-80 snap-center'
            >
              <img
                src={image}
                className='w-full h-full object-cover'
                alt={`Carousel image ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
