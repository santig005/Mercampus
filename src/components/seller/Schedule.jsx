import React from 'react';

export default function ToggleSwitch({ isOn, onToggle }) {
  return (
    <label
      className="flex items-center cursor-pointer w-14 h-8 relative" // Más grande
      onClick={onToggle}
    >
      <input
        type="checkbox"
        className="absolute w-full h-full opacity-0"
        checked={isOn}
        onChange={onToggle}
      />
      <div
        className={`w-full h-full flex items-center rounded-full p-1 transition-colors ${
          isOn ? 'bg-green-500' : 'bg-red-500'
        }`}
      >
        <div
          className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${
            isOn ? 'translate-x-6' : 'translate-x-0'
          }`}
        ></div>
      </div>
    </label>
  );
}
