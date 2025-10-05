'use client';
import { getTutors } from '@/services/tutorService';
import React, { useEffect, useState } from 'react';
import { useUniversity } from '@/context/UniversityContext';
import TutorCard from './TutorCard';
import TutorModalHandler from './TutorModalHandler';

export default function TutorGrid() {
  const [tutors, setTutors] = useState([]);
  const {university} = useUniversity();

  useEffect(() => {
    async function fetchTutors() {
      try {
        const data = await getTutors(university);
        setTutors(data.tutors);
      } catch (error) {
        console.error('Error fetching tutors:', error);
        setTutors([]);
      }
    }

    fetchTutors();
  }, [university]);

  return (
    <TutorModalHandler>
      {showModal => (
        <div>
          {tutors.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <div className='text-gray-400 mb-4'>
                <svg className='w-16 h-16 mx-auto' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1} d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' />
                </svg>
              </div>
              <h3 className='text-lg font-semibold text-gray-600 mb-2'>
                No hay tutores disponibles
              </h3>
              <p className='text-gray-500 max-w-md'>
                No hay tutores registrados para tu universidad en este momento.
              </p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {tutors.map(tutor => (
                <div
                  key={tutor._id}
                  onClick={() => showModal(tutor)}
                  className='cursor-pointer'
                >
                  <TutorCard tutor={tutor} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </TutorModalHandler>
  );
}
