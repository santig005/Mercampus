'use client';
import React, { useState } from 'react';
import { universities } from '@/utils/resources/universities';

const UniGraphicSelector = ({ value, onUniversityChange }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleChange = (event) => {
    const selectedUniversity = event.target.value;
    if (onUniversityChange) {
      onUniversityChange(selectedUniversity);
    }
  };

  const toggleTooltip = () => {
    setShowTooltip((prev) => !prev);
    if (!showTooltip) {
      setTimeout(() => setShowTooltip(false), 5000);
    }
  };

  return (
    <div className='relative flex items-center space-x-2'>
      <label htmlFor='university' className='block text-sm font-medium text-gray-700'>
        <svg
          className='inline-block w-5 h-5 mr-2 text-gray-500'
          xmlns='http://www.w3.org/2000/svg'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='2'
            d='M12 2C8.13401 2 5 5.13401 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13401 15.866 2 12 2ZM12 11C10.3431 11 9 9.65685 9 8C9 6.34315 10.3431 5 12 5C13.6569 5 15 6.34315 15 8C15 9.65685 13.6569 11 12 11Z'
          />
        </svg>
      </label>
      <select
        id='university'
        value={value}
        onChange={handleChange}
        className='mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md'
      >
        {universities.map((uni) => (
          <option key={uni} value={uni}>
            {uni}
          </option>
        ))}
      </select>

      {/* Icono de información con tooltip */}
      <div className='relative inline-block'>
        <button
          type='button'
          onClick={toggleTooltip}
          className='ml-2 p-1 focus:outline-none'
          aria-label='Información'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-5 w-5 text-yellow-500'
            viewBox='0 0 20 20'
            fill='currentColor'
          >
            <path
              fillRule='evenodd'
              d='M18 10c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8zm-8-1a1 1 0 110-2 1 1 0 010 2zm1 2a1 1 0 00-1-1H9a1 1 0 100 2h1v3a1 1 0 102 0v-4z'
              clipRule='evenodd'
            />
          </svg>
        </button>
        {showTooltip && (
          <div className='absolute top-full right-0 mt-2 w-64 p-2 bg-white border border-gray-300 rounded-lg shadow-lg text-sm text-gray-800'>
            Mercampus no está asociado con ninguna de las universidades; sus nombres solo aparecen con
            finalidad de filtro de búsqueda.
          </div>
        )}
      </div>
    </div>
  );
};

export default UniGraphicSelector;
