import React from 'react';

export default function LandlordCard({ landlord }) {
  return (
    <div className='bg-white shadow-md rounded-lg p-4'>
      <h3 className='text-lg font-semibold'>{landlord.name}</h3>
    </div>
  );
}
