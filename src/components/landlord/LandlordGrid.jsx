'use client';
import { getLandlords } from '@/services/landlordService';
import React, { useEffect, useState } from 'react';
import { useUniversity } from '@/context/UniversityContext';
import LandlordCard from './LandlordCard';

export default function LandlordGrid() {
  const [landlords, setLandlords] = useState([]);
  const {university} = useUniversity();

  useEffect(() => {
    async function fetchLandlords() {
      try {
        const data = await getLandlords(university);
        setLandlords(data.landlords);
      } catch (error){
        console.error('Error fetching landlords:', error);
        setLandlords([]);
      }
      }
    

    fetchLandlords();
  }, [university]);

  return (
    <div>
      {landlords.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-12 text-center'>
          <div className='text-gray-400 mb-4'>
            <svg className='w-16 h-16 mx-auto' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
            </svg>
          </div>
          <h3 className='text-lg font-semibold text-gray-600 mb-2'>
            No hay arrendadores disponibles
          </h3>
          <p className='text-gray-500 max-w-md'>
            No hay arrendadores registrados en este momento.
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {landlords.map(landlord => (
            <div
              key={landlord._id}
              className='cursor-pointer'
            >
              <LandlordCard landlord={landlord} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
