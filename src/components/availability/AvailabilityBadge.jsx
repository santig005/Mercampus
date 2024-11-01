import React from 'react';

const AvailabilityBadge = ({ availability }) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <label
          className={`block w-20 h-6 rounded-full cursor-pointer transition-colors ${
            availability ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          <span
            className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-semibold"
          >
            {availability ? 'Disponible' : 'No disponible'}
          </span>
        </label>
      </div>
    </div>
  );
};

export default AvailabilityBadge;
