'use client';
import SellerGrid from '@/components/seller/index/SellerGrid';
import { useState } from 'react';

function Sellers() {
  const [selectedSection, setSelectedSection] = useState('antojos');

  const handleSectionChange = (section) => {
    setSelectedSection(section);
  };

  return (
    <div className='p-2'>
      <h2 className='text-2xl font-bold text-center text-white bg-gradient-to-r from-red-500 to-[#FF7622] py-4 px-6 rounded-lg shadow-lg hover:scale-105 transition-transform duration-300 mt-4 mb-8'>
        {selectedSection === 'antojos' ? (
          <>¡Conoce a los <span className='text-yellow-300'>maestros</span> del sabor! 🎉</>
        ) : (
          <>¡Conoce a los <span className='text-yellow-300'>expertos</span> del marketplace! 🛍️</>
        )}
      </h2>

      {/* Selector de sección */}
      <div className='flex justify-center mb-6'>
        <div className='bg-white rounded-lg p-1 shadow-md'>
          <button
            onClick={() => handleSectionChange('antojos')}
            className={`px-6 py-2 rounded-md transition-all duration-200 ${
              selectedSection === 'antojos'
                ? 'bg-[#FF7622] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🍕 Antojos
          </button>
          <button
            onClick={() => handleSectionChange('marketplace')}
            className={`px-6 py-2 rounded-md transition-all duration-200 ${
              selectedSection === 'marketplace'
                ? 'bg-[#FF7622] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🛍️ Marketplace
          </button>
        </div>
      </div>

      <SellerGrid section={selectedSection} />
    </div>
  );
}

export default Sellers;
