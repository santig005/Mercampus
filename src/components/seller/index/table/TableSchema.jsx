import React from 'react';

export default function TableSchema({ schedules }) {
  return (
    <div className='overflow-x-auto hide-scrollbar'>
      <table className='table table-zebra text-nowrap bg-primary'>
        {/* Head */}
        <thead>
          <tr>
            <th>Día</th>
            <th>Hora de Inicio</th>
            <th>Hora Final</th>
          </tr>
        </thead>
        <tbody className='!bg-primary/10'>
          {Array.isArray(schedules) && schedules.length > 0 ? (
            schedules.map((schedule, index) => (
              <tr key={index}>
                <td>{schedule.day}</td>
                <td>{schedule.startTime}</td>
                <td>{schedule.endTime}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan='3' className='text-center'>
                No hay horarios disponibles
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
