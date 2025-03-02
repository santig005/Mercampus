'use client';
import React from 'react';
import { universities } from '@/utils/resources/universities';

const UniGraphicSelector = ({ value, onUniversityChange }) => {
  const handleChange = (event) => {
    const selectedUniversity = event.target.value;
    if (onUniversityChange) {
      onUniversityChange(selectedUniversity);
    }
  };

  return (
    <div className='flex items-center space-x-4'>
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
        value={value} // Ahora usa `value` como prop
        onChange={handleChange}
        className='mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md'
      >
        {universities.map((uni) => (
          <option key={uni} value={uni}>
            {uni}
          </option>
        ))}
      </select>
    </div>
  );
};

export default UniGraphicSelector;
