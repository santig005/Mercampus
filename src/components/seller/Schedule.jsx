import "daisyui";
import { daysOfWeekES } from "@/utils/resources/days";
import React, { useState } from 'react';


const Schedule = () => {
  const [schedules, setSchedules] = useState([
    { day: '', startTime: '', endTime: '' },
  ]);

  const [errorBanner, setErrorBanner] = useState(null);

  const handleAddSchedule = () => {
    setSchedules([...schedules, { day: '', startTime: '', endTime: '' }]);
  };

  const handleScheduleChange = (index, field, value) => {
    const updatedSchedules = schedules.map((schedule, i) =>
      i === index ? { ...schedule, [field]: value } : schedule
    );
    setSchedules(updatedSchedules);
    setErrorBanner(null); // Reset error banner on change
  };

  const validateSchedules = () => {
    for (let i = 0; i < schedules.length; i++) {
      const schedule = schedules[i];
      const startHour = parseInt(schedule.startTime.split(':')[0]);
      const endHour = parseInt(schedule.endTime.split(':')[0]);
      const startMinutes = parseInt(schedule.startTime.split(':')[1]);
      const endMinutes = parseInt(schedule.endTime.split(':')[1]);

      if (!schedule.day) {
        setErrorBanner(`Error en el horario ${i + 1}: Selecciona un día.`);
        return false;
      }

      if (!schedule.startTime || !schedule.endTime) {
        setErrorBanner(`Error en el horario ${i + 1}: Ambos campos de tiempo deben estar completos.`);
        return false;
      }

      if (startHour < 6) {
        setErrorBanner(`Error en el horario ${i + 1}: La hora de inicio debe ser a partir de las 6:00 AM.`);
        return false;
      }

      if (endHour > 21 || (endHour === 21 && endMinutes > 0)) {
        setErrorBanner(`Error en el horario ${i + 1}: La hora de fin debe ser hasta las 9:00 PM.`);
        return false;
      }

      if (
        endHour < startHour ||
        (endHour === startHour && endMinutes <= startMinutes)
      ) {
        setErrorBanner(`Error en el horario ${i + 1}: La hora de fin debe ser posterior a la hora de inicio.`);
        return false;
      }
    }
    return true;
  };

  const payload = {
    sellerId: "67494329273a1f9b5c67f5f1",
    schedules: schedules,
  };

  const handlePrintSchedules = async () => {
    if (validateSchedules()) {
      setErrorBanner(null); // Clear error banner if validation passes
      try {
        const response = await fetch('/api/schedules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Horarios guardados con éxito:', data);
        } else {
          const errorData = await response.json();
          console.error('Error al guardar horarios:', errorData.message);
          setErrorBanner(errorData.message);
        }
      } catch (error) {
        console.error('Error al realizar la solicitud:', error);
        setErrorBanner('Error al conectar con el servidor.');
      }
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Tus horarios</h1>
      <h2>
        En la siguiente sección puedes agregar tus horarios, luego puedes
        agregar, modificar o eliminar los que necesites ^_^
      </h2>
      {errorBanner && <div className="alert alert-error mb-4">{errorBanner}</div>}
      {schedules.map((schedule, index) => (
        <div key={index} className="flex items-center gap-4 mb-4">
          <select
            className="select select-bordered w-full max-w-xs"
            value={schedule.day}
            onChange={(e) => handleScheduleChange(index, 'day', e.target.value)}
          >
            <option value="">Selecciona un día</option>
            {daysOfWeekES.map((day) => (
              <option key={day.id} value={day.id}>{day.name}</option>
            ))}
          </select>

          <input
            type="time"
            className="input input-bordered w-full max-w-xs"
            value={schedule.startTime}
            onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
          />

          <input
            type="time"
            className="input input-bordered w-full max-w-xs"
            value={schedule.endTime}
            onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
          />
        </div>
      ))}
      <div className="flex gap-4">
        <button className="btn btn-primary" onClick={handleAddSchedule}>Agregar horario</button>
        <button className="btn btn-secondary" onClick={handlePrintSchedules}>Imprimir horarios</button>
      </div>
    </div>
  );
};

export default Schedule;
