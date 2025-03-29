import React, { useEffect, useState } from 'react';

const dayMap = {
  "Lunes": 1,
  "Martes": 2,
  "Miércoles": 3,
  "Jueves": 4,
  "Viernes": 5,
  "Sábado": 6,
  "Domingo": 7,
};

const AvailabilityBadge = ({schedules }) => {
  const [availability, setAvailability] = useState(false);

  useEffect(() => {
    if (!schedules || Object.keys(schedules).length === 0) {
      setAvailability(false);
      return;
    }

    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay(); // Convert Sunday from 0 to 7
    const currentTime = now.toTimeString().slice(0, 5); // Get HH:MM format

    const isAvailable = schedules.some(schedule => {
      const scheduleDay = dayMap[schedule.day]; // Convert string day to number
      return (
        scheduleDay === currentDay &&
        schedule.startTime <= currentTime &&
        schedule.endTime >= currentTime
      );
    });

    setAvailability(isAvailable);
  }, [schedules]);

  return (
    <div className='flex items-center space-x-2'>
      <div className='relative'>
        <label
          className={`block w-20 h-[20px] rounded-md transition-colors ${
            availability ? 'bg-[#03CF30]/15' : 'bg-[#CF0303]/15'
          }`}
        >
          <span
            className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold ${
              availability ? 'text-[#03CF30]' : 'text-[#CF0303]'
            }`}
          >
            {availability ? 'Disponible' : 'No disponible'}
          </span>
        </label>
      </div>
    </div>
  );
};

export default AvailabilityBadge;