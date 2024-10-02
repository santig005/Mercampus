import Hambtn from '@/components/header/Hambtn';
import Layout from '@/components/layout/Layout';
import React from 'react';

export default function layout({ children }) {
  return (
    <div className='drawer z-40'>
      <input id='my-dibujador' type='checkbox' className='drawer-toggle' />
      <div className='drawer-content'>
        <Layout>{children}</Layout>
      </div>
      <div className='drawer-side'>
        <label
          htmlFor='my-dibujador'
          aria-label='close sidebar'
          className='drawer-overlay'
        ></label>
        <ul className='menu text-base-content min-h-full w-80 p-4 pt-16 bg-primary'>
          {/* Sidebar content here */}
          <li>
            <a>Sidebar Item 1</a>
          </li>
          <li>
            <a>Sidebar Item 2</a>
          </li>
        </ul>
      </div>
    </div>
  );
}