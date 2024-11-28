import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@clerk/nextjs';
const URL = process.env.NEXT_PUBLIC_URL;

const Schedule = () => {
  const router = useRouter();
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [hours, setHours] = useState([]);
  const [formSchedules, setFormSchedules] = useState([
    { day: '', startTime: '', endTime: '' },
  ]);
  const [businessName, setBusinessName] = useState('');
  const { session } = useSession();

  console.log(session?.publicUserData.identifier);

  // Fetch days from API
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

  // Fetch hours from API
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

  // Fetch business name from API
  useEffect(() => {
    const fetchBusinessName = async () => {
      try {
        const response = await fetch('/api/sellers');
        const data = await response.json();
        setBusinessName(data.seller?.businessName);
      } catch (error) {
        console.error('Error fetching business name:', error);
      }
    };
    fetchBusinessName();
  }, []);

  // Add a new empty schedule
  const handleAddSchedule = () => {
    setFormSchedules([
      ...formSchedules,
      { day: '', startTime: '', endTime: '' },
    ]);
  };

  // Update specific schedule
  const handleScheduleChange = (index, field, value) => {
    const updatedSchedules = formSchedules.map((schedule, i) =>
      i === index ? { ...schedule, [field]: value } : schedule
    );
    setFormSchedules(updatedSchedules);
  };

  // Send data to API
  const handleSendData = async () => {
    // Check if all schedules have values and if endTime is greater than startTime
    for (const schedule of formSchedules) {
      if (!schedule.day || !schedule.startTime || !schedule.endTime) {
        alert('Todos los campos deben estar llenos.');
        return;
      }

      // Ensure the endTime is greater than startTime based on their IDs
      if (schedule.endTime <= schedule.startTime) {
        alert('El horario de fin debe ser mayor que el horario de inicio.');
        return;
      }
    }

    console.log({ formSchedules });
    // te
    try {
      const response = await fetch(`${URL}/api/schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formSchedules),
      });

      if (response.ok) {
        router.push('/antojos');
      } else {
        throw new Error('Error sending data');
      }
    } catch (error) {
      console.error('Error sending data:', error);
    }
  };

  return (
    <div>
      {businessName && (
        <h1>Has registrado exitosamente el comercio {businessName}</h1>
      )}
      <h1>Un último paso...</h1>
      <h2>
        En la siguiente sección puedes agregar tus horarios, luego puedes
        agregar, modificar o eliminar los que necesites
      </h2>
      {formSchedules.map((schedule, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '10px',
          }}
        >
          <div style={{ flex: 1, marginRight: '10px' }}>
            <label htmlFor={`day-${index}`}>Día:</label>
            <select
              id={`day-${index}`}
              value={schedule.day}
              onChange={e => handleScheduleChange(index, 'day', e.target.value)}
            >
              <option value=''>Selecciona un día</option>
              {daysOfWeek.map(day => (
                <option key={day._id} value={day._id}>
                  {day.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, marginRight: '10px' }}>
            <label htmlFor={`startTime-${index}`}>Hora Inicio:</label>
            <select
              id={`startTime-${index}`}
              value={schedule.startTime}
              onChange={e =>
                handleScheduleChange(index, 'startTime', e.target.value)
              }
            >
              <option value=''>Selecciona una hora</option>
              {hours.map(hour => (
                <option key={hour._id} value={hour._id}>
                  {hour.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor={`endTime-${index}`}>Hora Final:</label>
            <select
              id={`endTime-${index}`}
              value={schedule.endTime}
              onChange={e =>
                handleScheduleChange(index, 'endTime', e.target.value)
              }
            >
              <option value=''>Selecciona una hora</option>
              {hours.map(hour => (
                <option key={hour._id} value={hour._id}>
                  {hour.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}
      <button style={{ margin: '10px' }} onClick={handleAddSchedule}>
        Agregar otro horario
      </button>
      <button style={{ margin: '10px' }} onClick={handleSendData}>
        Enviar datos
      </button>
    </div>
  );
};

export default Schedule;
