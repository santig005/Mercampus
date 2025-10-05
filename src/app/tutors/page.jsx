'use client';
import TutorGrid from '@/components/tutor/TutorGrid';

function Tutors() {
  return (
    <div className='p-2'>
      <h2 className='text-2xl font-bold text-center text-white bg-gradient-to-r from-green-500 to-blue-500 py-4 px-6 rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 mt-4 mb-8'>
        ¡Encuentra a tu tutor ideal! 🎓
      </h2>
      <TutorGrid />
    </div>
  );
}

export default Tutors;
