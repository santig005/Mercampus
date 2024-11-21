'use client';

import React, { useEffect, useRef, useState } from 'react';

export default function Carousel({ images, _id: id }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    // Crear el Intersection Observer
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index'), 10);
            setCurrentIndex(index);
          }
        });
      },
      {
        root: carouselRef.current,
        threshold: 0.8, // Se considera visible si al menos el 80% del elemento está visible
      }
    );

    // Observar cada imagen del carrusel
    const currentItemRefs = itemRefs.current;
    currentItemRefs.forEach(item => {
      if (item) observer.observe(item);
    });

    // Limpieza del Observer
    return () => {
      if (observer) {
        currentItemRefs.forEach(item => {
          if (item) observer.unobserve(item);
        });
      }
    };
  }, []);

  return (
    <div
      ref={carouselRef}
      className='carousel rounded-none w-full h-80 overflow-x-scroll snap-x snap-mandatory scroll-smooth relative'
    >
      {/* Indicators */}
      <div className='fixed top-64 left-1/2 transform -translate-x-1/2 flex gap-2 z-10'>
        {images.map((_, index) => (
          <button
            key={id + '-indicator-' + index}
            className={`w-3 h-3 rounded-full ${
              index === currentIndex ? 'bg-primary-orange' : 'bg-gray-400'
            }`}
          ></button>
        ))}
      </div>

      {/* Carousel Items */}
      <div className='flex carousel-item w-full'>
        {images.map((image, index) => (
          <div
            key={id + index}
            ref={el => (itemRefs.current[index] = el)}
            data-index={index}
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
  );
}
