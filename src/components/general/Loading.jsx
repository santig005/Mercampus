import React from 'react';

const Loading = () => {
  return (
    <div className='flex flex-col gap-2'>
     {/*  <div className='fixed flex items-center justify-center h-screen z-50'>
            <div className='flex justify-center'>
              <span className='loading loading-infinity loading-lg bg-primary-orange'></span>
            </div>
      </div> */}
      <div className='flex justify-center'>
              <span className='loading loading-infinity loading-lg bg-primary-orange'></span>
            </div>
    </div>
  );
};

export default Loading;