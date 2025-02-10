import React from 'react'

export default function SellerBadge({seller}) {
  return (
    <div className='flex items-center space-x-2'>
      <div className='relative'>
        <label
          className='block w-20 h-[20px] rounded-md cursor-pointer transition-colors'
        >
          <span
            className='absolute inset-0 flex items-center justify-center text-[10px] font-semibold'
          >
            bellako
          </span>
        </label>
      </div>
    </div>
  )
}
