import React from 'react';

export default function TableSche() {
  return (
    <div className='overflow-x-auto hide-scrollbar'>
      <table className='table table-zebra text-nowrap'>
        {/* head */}
        <thead>
          <tr>
            <th>Día</th>
            <th>Hora</th>
            <th>Ubicación</th>
          </tr>
        </thead>
        <tbody>
          {/* row 1 */}
          <tr>
            <th>Lunes</th>
            <td>7:00am - 10:00am</td>
            <td>Bloque 38</td>
          </tr>
          {/* row 2 */}
          <tr>
            <th>Martes</th>
            <td>7:00am - 10:00am</td>
            <td>Bloque 38</td>
          </tr>
          {/* row 3 */}
          <tr>
            <th>Miércoles</th>
            <td>7:00am - 10:00am</td>
            <td>Bloque 38</td>
          </tr>
          <tr>
            <th>Jueves</th>
            <td>7:00am - 10:00am</td>
            <td>Bloque 38</td>
          </tr>
          <tr>
            <th>Viernes</th>
            <td>7:00am - 10:00am</td>
            <td>Bloque 38</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
