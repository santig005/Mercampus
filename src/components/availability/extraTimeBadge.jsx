import React, { useEffect, useState} from 'react';

const AvailabilityBadge = ({ seller, setSeller }) => {
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const timeOptions = { '30 min': 30, '1 h': 60, '3 h': 180, '6 h': 360, '12 h': 720, '24 h': 1440 };

  const handleConfirm = async () => {
    if (!selectedTime) return;
    console.log("al entrar a handleConfirm");
    setLoading(true);
    console.log("el current ")
    setError(null);

    try {
      const dateUTC = new Date();
      const now = new Date(dateUTC.getTime() - 5 * 60 * 60 * 1000);
      //sumar now + selectedTime
      now.setMinutes(now.getMinutes() + timeOptions[selectedTime]);
      
      const sellerData = {
        extraTime: now,
        temporalAvailability: !seller.temporalAvailability,
        statusExtraTime: true
      };

      const response = await fetch(`/api/sellers/${seller._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sellerData)
      });

      if (!response.ok) {
        throw new Error('Error actualizando la disponibilidad');
      }
      setSeller({ ...seller, extraTime: now, temporalAvailability: !seller.temporalAvailability, statusExtraTime: true });
      

      // Obtener disponibilidad actualizada
      const availabilityResponse = await fetch(`/api/sellers/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _id: seller._id, ...sellerData }),
      });

      if (!response.ok) {
        throw new Error('Error obteniendo la disponibilidad actualizada');
      }

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatExtraTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const day = date.getUTCDate();
    const month = months[date.getUTCMonth()];
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'p.m.' : 'a.m.';
    hours = hours % 12 || 12;
    return `${day} de ${month} ${hours}:${minutes} ${period}`;
  };

  return (
    <div className='flex flex-col items-center space-y-3'>
      <p className='text-sm font-semibold text-gray-700 flex items-center space-x-2'>
        <span>Quiero estar</span>
        <span className={`px-3 py-1 rounded-md text-sm font-semibold ${seller.availability ? 'bg-red-200 text-red-600' : 'bg-green-200 text-green-600'}`}>
          {seller.availability ? 'No disponible' : 'Disponible'}
        </span>
        <span>durante:</span>
      </p>
      <div className='flex items-center space-x-2'>
        <select
          className='px-3 py-2 border rounded-md text-sm font-medium bg-white text-gray-700'
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          title="Selecciona el tiempo de disponibilidad"
        >
          <option value='' disabled>Selecciona el tiempo</option>
          {Object.keys(timeOptions).map((time) => (
            <option key={time} value={time}>{time}</option>
          ))}
        </select>
        <button
          className='btn btn-primary'
          disabled={!selectedTime || loading}
          onClick={handleConfirm}
          aria-busy={loading}
        >
          {loading ? 'Cargando...' : 'Sí'}
        </button>
      </div>
      {seller.statusExtraTime && (
        <p className="text-sm text-gray-500 mt-2">
          Activo hasta <strong>{formatExtraTime(seller.extraTime)}</strong>
        </p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default AvailabilityBadge;