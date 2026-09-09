import React from 'react';

// T-98 (audit finding F32): `label` is the accessible name for the checkbox -
// callers with more than one toggle on a page (a product list, one per row)
// need it to say which row's switch this is, since the visible "Disponibilidad"
// text next to it is a <p>, not a <label for>.
export default function ToggleSwitch({ isOn, onToggle, label }) {
  return (
    <label className='flex items-center cursor-pointer'>
      {/* <input
        type="checkbox"
        className="hidden"
        checked={isOn}
        onChange={onToggle}
      />
      <div
        className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${
          isOn ? 'bg-green-500' : 'bg-red-500'
        }`}
      >
        <div
          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
            isOn ? 'translate-x-4' : 'translate-x-0'
          }`}
        ></div>
      </div> */}
      <input
        type='checkbox'
        aria-label={label}
        className={
          'toggle border-red-600 bg-red-500 checked:bg-green-400 checked:text-green-800 checked:border-green-500 hover:bg-red-400 hover:border-red-600 checked:hover:bg-green-500 checked:hover:border-green-600 transition-all duration-200 ease-in-out'
        }
        checked={isOn}
        onChange={onToggle}
      />
    </label>
  );
}
