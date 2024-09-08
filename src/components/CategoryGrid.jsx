import React from 'react';

export default function CategoryGrid() {
  return (
    <div className='flex gap-2 overflow-x-auto whitespace-nowrap'>
      <button className='btn btn-primary rounded-full'>Todos</button>
      <button className='btn bg-white rounded-full'>Brownies</button>
      <button className='btn bg-white rounded-full'>Fruta</button>
      <button className='btn bg-white rounded-full'>Galletas</button>
      <button className='btn bg-white rounded-full'>Caramelos</button>
    </div>
  );
}
