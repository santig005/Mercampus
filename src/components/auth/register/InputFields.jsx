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

  const handleChange = e => {
    setInputValue(e.target.value);
    if (onChange) {
      onChange(e); // Si el componente padre maneja el estado, se lo pasamos.
    }
  };

  return (
    <div className='flex flex-col gap-1'>
      <p className='text'>{title}</p>
      <div className='flex justify-center items-center gap-2'>
        {title.includes('Instagram') && <p>@</p>}
        {type === 'textarea' ? (
          <textarea
            className={`bg-[#f0f5fa] min-h-10 px-4 py-3 rounded-lg input resize-none w-full overflow-hidden ${className}`}
            placeholder={placeholder}
            value={inputValue}
            onChange={handleChange}
            {...props}
          />
        ) : (
          <input
            type={type}
            className={`bg-[#f0f5fa] min-h-10 px-4 rounded-lg input w-full ${className} ${
              secureText ? 'tracking-wide' : ''
            }`}
            placeholder={placeholder}
            value={inputValue} // Evita valores undefined
            onChange={handleChange}
            {...props}
          />
        )}
      </div>
    </div>
  );
}
