import React from 'react';

export default function Carousel({ images, _id: id }) {
  return (
    <div className='carousel rounded-none w-full h-80'>
      {images.map((image, index) => (
        <div key={id + index} className='carousel-item w-full'>
          <img
            src={image}
            className='w-full img-full'
            alt='Tailwind CSS Carousel component'
          />
        </div>
      ))}
    </div>
  );
}
