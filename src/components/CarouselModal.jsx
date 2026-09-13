/* eslint-disable @next/next/no-img-element */
'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MdCloseFullscreen } from 'react-icons/md';

export default function CarouselModal({ images, initialIndex, id }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex); // Current index
  const carouselRef = useRef(null); // Ref to the carousel container

  // Update the current index on scroll
  const updateCurrentIndex = useCallback(() => {
    const scrollLeft = carouselRef.current.scrollLeft;
    const width = carouselRef.current.offsetWidth;
    const index = Math.round(scrollLeft / width);
    setCurrentIndex(index);
  }, []);

  // Set the starting index when the modal opens
  useEffect(() => {
    setCurrentIndex(initialIndex);
    if (carouselRef.current) {
      carouselRef.current.scrollTo({
        left: initialIndex * carouselRef.current.offsetWidth,
        behavior: 'smooth',
      });
    }
  }, [initialIndex]);

  // Listen for `scroll` on the carousel container
  useEffect(() => {
    const carouselElement = carouselRef.current;
    if (!carouselElement) return;

    carouselElement.addEventListener('scroll', updateCurrentIndex);

    return () => {
      carouselElement.removeEventListener('scroll', updateCurrentIndex);
    };
  }, [updateCurrentIndex]);

  return (
    <dialog className='modal backdrop-blur-md p-4' id={`carousel_modal_${id}`}>
      <div className='modal-box p-0 rounded-md h-auto !bg-transparent modal-width'>
        {/* Cerrar el modal */}
        <button
          onClick={() =>
            document.getElementById(`carousel_modal_${id}`).close()
          }
          className='absolute top-4 right-4 text-white text-2xl z-20 bg-base-100 rounded-full p-1'
        >
          <MdCloseFullscreen className='text-base-content' />
        </button>
        {/* Indicadores */}
        {images.length > 1 && (
          <div className='absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-10 bg-base-100 p-1 rounded-badge'>
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
