import React, { useState, useEffect } from 'react';

const Schedule = () => {
  const [day, setDay] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [hours, setHours] = useState([]);

  // Fetch para obtener los días desde la API
  useEffect(() => {
    const fetchDays = async () => {
      try {
        const response = await fetch('/api/days');
        const data = await response.json();
        setDaysOfWeek(data);
      } catch (error) {
        console.error('Error fetching days:', error);
      }
    };
    fetchDays();
  }, []);
  // Fetch para obtener las horas desde la API
  useEffect(() => {
    const fetchHours = async () => {
      try {
        const response = await fetch('/api/times');
        const data = await response.json();
        setHours(data);
      } catch (error) {
        console.error('Error fetching times:', error);
      }
    };
    fetchHours();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ flex: 1, marginRight: '10px' }}>
          <label htmlFor="day">Día:</label>
          <select id="day" value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="">Selecciona un día</option>
            {daysOfWeek.map((day) => (
              <option key={day._id} value={day.name}>
                {day.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, marginRight: '10px' }}>
          <label htmlFor="startTime">Hora Inicio:</label>
          <select id="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)}>
            <option value="">Selecciona una hora</option>
            {hours.map((hour) => (
              <option key={hour._id} value={hour.name}>
                {hour.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label htmlFor="endTime">Hora Final:</label>
          <select id="endTime" value={endTime} onChange={(e) => setEndTime(e.target.value)}>
            <option value="">Selecciona una hora</option>
            {hours.map((hour) => (
              <option key={hour._id} value={hour.name}>
                {hour.name}
              </option>
            ))}
          </select>
        </div>
        <button style={{ marginLeft: '10px', alignSelf: 'flex-end' }} onClick={() => console.log('Button clicked')}>
          +
        </button>
      </div>
    </div>
  );
};

export default Schedule;
