'use client';

import { formatPhone, formatValue, parseIfJSON } from '@/utils/utilFn';
import Flag from '@public/images/Flag_of_Colombia.svg';
import React, { useEffect, useState } from 'react';

export default function InputFields({
  title,
  type,
  placeholder,
  secureText = false,
  className,
  value,
  onChange,
  name,
  ...props
}) {
  const [inputValue, setInputValue] = useState(value || '');
  const [validNumber, setValidNumber] = useState(true);
  const [displayPrice, setDisplayPrice] = useState(
    formatValue(title.includes('Precio') ? value : '')
  );
  const [displayNumber, setDisplayNumber] = useState(
    formatPhone(title.includes('Teléfono') ? value : '')
  );

  const handlePriceChange = e => {
    const rawValue = e.target.value.replace(/\D/g, ''); // Strip non-numeric characters
    const numericValue = rawValue ? parseInt(rawValue, 10) : 0;

    // Format the number with thousands separators and a currency symbol
    const formattedValue = formatValue(numericValue);


    setDisplayPrice(formattedValue);
    onChange({ target: { name: 'price', value: numericValue.toString() } });
  };

  const handleChange = e => {
    handleResize(e);
    setInputValue(e.target.value);
    if (onChange) {
      onChange(e); // If the parent component owns the state, hand it over.
    }
  };

  const handleResize = e => {
    requestAnimationFrame(() => {
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
    });
  };

  // make a function to handle the phone number input field
  const handlePhoneChange = e => {
    let { value } = e.target;
    let phone = value.replace(/\D/g, ''); // Strip non-numeric characters

    // While the user is deleting, avoid leaving stray characters behind
    if (phone.length === 0) {
      setDisplayNumber('');
      setValidNumber(false);
      if (onChange) {
        onChange({ ...e, target: { ...e.target, value: '' } });
      }
      return;
    }

    let formattedPhone = formatPhone(phone);

    setDisplayNumber(formattedPhone);

    // Check the number is valid (10 digits)
    setValidNumber(phone.length === 10);

    if (onChange) {
      onChange(e); // Send digits only
    }
  };

  useEffect(() => {
    // Run handleResize for every textarea when the component mounts
    const textAreas = document.querySelectorAll('textarea');
    textAreas.forEach(textarea => handleResize({ target: textarea }));
  }, []);

  return (
    <div className='flex flex-col gap-1'>
      <p className='text'>{title}</p>
      <div className='flex justify-center items-center gap-2'>
        {title.includes('Instagram') && <p>@</p>}
        {type === 'textarea' ? (
          <textarea
            className={`bg-[#f0f5fa] min-h-10 px-4 py-3 rounded-lg input resize-none w-full overflow-hidden ${className}`}
            placeholder={placeholder}
            value={parseIfJSON(inputValue)}
            onChange={handleChange}
            autoComplete='off'
            autoSave='off'
            name={name}
            {...props}
          />
        ) : type === 'tel' ? (
          <div className='flex items-center flex-grow'>
            <div className='rounded-l-md overflow-hidden h-12 w-16 pointer-events-none'>
              <img src={Flag.src} alt='' className='h-full w-full' />
            </div>
            <input
              type={type}
              className={`bg-[#f0f5fa] min-h-10 px-4 rounded-none rounded-r-md input w-full ${
                validNumber
                  ? 'focus-within:border-green-500 border-green-500'
                  : 'focus-within:border-red-500 border-red-500'
              } ${className} ${secureText ? 'tracking-wide' : ''}`}
              placeholder={placeholder}
              value={displayNumber} // Evita valores undefined
              onChange={handlePhoneChange}
              name={name}
              autoComplete='off'
              autoSave='off'
              pattern='\(\d{3}\) \d{3}-\d{4}'
              {...props}
            />
          </div>
        ) : (
          <input
            name={name}
            type={type}
            className={`bg-[#f0f5fa] min-h-10 px-4 rounded-lg input w-full ${className} ${
              secureText ? 'tracking-wide' : ''
            }`}
            placeholder={placeholder}
            value={title.includes('Precio') ? displayPrice : inputValue}
            onChange={
              title.includes('Precio') ? handlePriceChange : handleChange
            }
            {...props}
          />
        )}
      </div>
    </div>
  );
}
