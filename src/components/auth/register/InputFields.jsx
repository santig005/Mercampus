'use client';

import React, { useState } from 'react';

export default function InputFields({
  title,
  type,
  placeholder,
  secureText = false,
  className,
  value,
  onChange,
  ...props
}) {
  const [inputValue, setInputValue] = useState(value || '');

  const handleChange = (e) => {
    setInputValue(e.target.value);
    if (onChange) {
      onChange(e); // Si el componente padre maneja el estado, se lo pasamos.
    }
  };

  return (
    <div className='flex flex-col gap-1'>
      <p className='text'>{title}</p>
      <div className="flex justify-center items-center gap-2">
        {title.includes('Instagram') && <p>@</p>}
        <input
          type={type}
          className={`bg-[#f0f5fa] w-full h-10 px-4 rounded-lg input ${className} ${
            secureText ? 'tracking-wide' : ''
          }`}
          placeholder={placeholder}
          value={inputValue} // Evita valores undefined
          onChange={handleChange}
          {...props}
        />
      </div>
    </div>
  );
}
