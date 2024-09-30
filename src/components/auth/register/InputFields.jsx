'use client';

import React, { useState } from 'react';

export default function InputFields({
  title,
  type,
  placeholder,
  secureText = false,
  className,
  ...props
}) {
  return (
    <div className='flex flex-col gap-1'>
      <p className='text'>{title}</p>
      <input
        type={type}
        className={`bg-[#f0f5fa] w-full h-10 px-4 rounded-lg ${className} ${
          secureText ? 'tracking-wide' : ''
        }`}
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
}
