/* eslint-disable @next/next/no-img-element */
'use client';

import CarouselModal from '@/components/CarouselModal';
import React, { useEffect, useRef, useState } from 'react';

export default function Carousel({ images, _id: id }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const carouselRef = useRef(null);

  const updateCurrentIndex = () => {
    const scrollLeft = carouselRef.current.scrollLeft;
    const width = carouselRef.current.offsetWidth;
    const index = Math.round(scrollLeft / width);
    setCurrentIndex(index);
  };

  useEffect(() => {
    const carouselElement = carouselRef.current;
    if (!carouselElement) return;

    carouselElement.addEventListener('scroll', updateCurrentIndex);

    return () => {
      carouselElement.removeEventListener('scroll', updateCurrentIndex);
    };
  }, []);

  useEffect(() => {
    setCurrentIndex(0); // Resetear índice al cambiar imágenes
  }, [images]);

  return (
    <div className='relative w-full h-80'>
      {/* Indicators */}
      {images.length > 1 && (
        <div className='absolute bottom-14 left-1/2 transform -translate-x-1/2 flex gap-2 z-10 bg-white p-1 rounded-badge'>
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

      {/* Carousel Container */}
      <div
        ref={carouselRef}
        className='carousel w-full h-full overflow-x-scroll snap-x snap-mandatory scroll-smooth relative'
      >
        <div className='flex w-full h-full'>
          {images.map((image, index) => (
            <div
              key={id + index}
              className='carousel-item w-full flex-shrink-0 h-80 snap-center'
              onClick={() => {
                document.getElementById(`carousel_modal_${id}`).showModal();
              }}
            >
              <img
                src={image}
                className='w-full h-full object-cover cursor-pointer'
                alt={`Carousel image ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Modal Secundario */}
      <CarouselModal
        key={id}
        images={images}
        initialIndex={currentIndex}
        id={id}
      />
    </div>
  );
}
