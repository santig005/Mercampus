import "daisyui";
import { daysOfWeekES } from "@/utils/resources/days";
import { getSchedules, createSchedule } from "@/services/scheduleService";
import React, { useState,useEffect } from 'react';
import { useUser } from "@clerk/nextjs";
import { getSellerByEmail } from "@/services/sellerService";

const Schedule = () => {
  const [schedules, setSchedules] = useState([
    {id:null, day: '', startTime: '', endTime: '' },
  ]);

  const [errorBanner, setErrorBanner] = useState(null);
  const { user } = useUser();
  const [sellerId,setSellerId]=useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      window.location.href = '/';
      return;
    }

    const fetchSeller = async () => {
      try {
        const email = user.primaryEmailAddress.emailAddress;
        const seller = await getSellerByEmail(email);
        setSellerId(seller._id);
      } catch (error) {
        console.log("error en el seller", error);
        setSellerId(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSeller();
  }, [user]);

  useEffect(() => {
    if (!isLoading && !sellerId) {
      window.location.href = '/antojos/sellers/register';
      return;
    }

    if (sellerId) {
      const fetchSchedules = async () => {
        try {
          const response = await getSchedules(sellerId);
          const mappedSchedules = response.schedules.map((schedule) => ({
            id: schedule._id, // ID único para manejo de componentes
            day: schedule.day,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          }));
          setSchedules(mappedSchedules);
        } catch (error) {
          setErrorBanner("No se pudieron cargar los horarios.");
        }
      };

      fetchSchedules();
    }
  }, [sellerId, isLoading]);  

  const handleAddSchedule = () => {
    setSchedules([...schedules, { id:null,day: '', startTime: '', endTime: '' }]);
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
    sellerId: sellerId,
    schedules: schedules,
  };
  const handleRemoveSchedule = (index) => {
    const updatedSchedules = schedules.filter((_, i) => i !== index);
    setSchedules(updatedSchedules);
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
        console.log('Schedules printed successfully');
        window.location.href = '/antojos';
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
        En la siguiente sección puedes agregar los horarios que necesites, modificar o eliminar los que ya tienes ^_^
      </h2>
      <li>
      Ten en cuenta, solo horarios entre 6:00AM y 9:00PM 🧐
      </li>
      <li>Hora inicial debe ser antes que la final 🧐</li>
      {errorBanner && <div className="alert alert-error mb-4">{errorBanner}</div>}
      {schedules.map((schedule, index) => (
        <div key={index} className="flex flex-col md:flex-row items-center gap-2 mb-4">
          <div className="flex gap-2 w-full md:w-auto">
          <select
            className="select select-bordered w-full md:w-40"
            value=""
            onChange={(e) => handleScheduleChange(index, 'day', e.target.value)}
          >
            <option value="">{schedule.day || ""}</option>
            {daysOfWeekES.map((day) => (
              <option key={day.id} value={day.name}>
                {day.name}
              </option>
            ))}
          </select>
          <button
            className="btn btn-error btn-sm ml-2"
            onClick={() => handleRemoveSchedule(index)}
          >
            Eliminar
          </button>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
          <label className="text-sm font-medium text-gray-600">Hora Inicial</label>
            <input
              type="time"
              className="input input-bordered w-full md:w-24"
              value={schedule.startTime}
              onChange={(e) => handleScheduleChange(index, 'startTime', e.target.value)}
            />
            <label className="text-sm font-medium text-gray-600">Hora Final</label>
            <input
              type="time"
              className="input input-bordered w-full md:w-24"
              value={schedule.endTime}
              onChange={(e) => handleScheduleChange(index, 'endTime', e.target.value)}
            />
          </div>

        </div>
      ))}
      <div className="flex gap-4">
        <button className="btn btn-primary" onClick={handleAddSchedule}>Agregar horario</button>
        <button className="btn btn-secondary" onClick={handlePrintSchedules}>Guardar horarios</button>
      </div>
    </div>
  );
};

export default Schedule;