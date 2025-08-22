'use client';
import React, { useState } from 'react';
import { universities } from '@/utils/resources/universities';
import { IoLocationSharp, IoInformationCircle } from 'react-icons/io5';
import { FaChevronDown } from 'react-icons/fa';

const UniGraphicSelector = ({ value, onUniversityChange }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectUniversity = (university) => {
    onUniversityChange(university);
    setIsOpen(false);
  };
  
  const toggleTooltip = () => {
    setShowTooltip((prev) => !prev);
    if (!showTooltip) {
      setTimeout(() => setShowTooltip(false), 5000);
    }
  };

  return (
    <div className='relative flex items-center'>
      <label htmlFor='university' className='block text-sm font-medium text-gray-700 mr-2'>
        <IoLocationSharp className='inline-block w-5 h-5 text-gray-500' />
      </label>
      <div className='relative flex-grow'>
        <button
          type='button'
          className={`flex items-center justify-between w-full pl-3 pr-8 py-2 text-sm border rounded-md bg-white shadow-sm focus:outline-none ${value !== 'Seleccionar Universidad' ? 'border-orange-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className='truncate mr-2'>{value}</span>

          <FaChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <ul className='absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto'>
            {universities.map((uni) => (
              <li
                key={uni}
                className='px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer'
                onClick={() => handleSelectUniversity(uni)}
              >
                {uni}
              </li>
            ))}
          </ul>
        )}

        <button
          type='button'
          onClick={toggleTooltip}
          className='absolute right-1 top-1/2 transform -translate-y-1/2 p-1 focus:outline-none'
          aria-label='Información'
        >
          <IoInformationCircle
            className='h-5 w-5 text-yellow-500'
          >
          </IoInformationCircle>

        </button>

        {showTooltip && (

          <div className='absolute top-full right-2 mt-2 w-64 p-2 bg-white border border-gray-300 rounded-lg shadow-lg text-sm text-gray-800'>
            Mercampus no está asociado con ninguna de las universidades; sus nombres solo aparecen con finalidad de filtro de búsqueda.          
          </div>
        )}
      </div>
    </div>
  );
};

export default UniGraphicSelector;
