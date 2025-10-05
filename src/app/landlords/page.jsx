'use client';
import LandlordGrid from '@/components/landlord/LandlordGrid';

function Landlords() {
  return (
    <div className='p-2'>
      <h2 className='text-2xl font-bold text-center text-white bg-gradient-to-r from-blue-500 to-purple-500 py-4 px-6 rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 mt-4 mb-8'>
        ¡Encuentra tu nuevo hogar! 🏠
      </h2>
      <LandlordGrid />
    </div>
  );
}

export default Landlords;
