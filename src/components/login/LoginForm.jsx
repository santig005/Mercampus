import React from 'react';

const LoginForm = () => {
    return (
      <form className='flex justify-center items-center flex-col gap-3 w-full h-dvh'>
        <label className='input input-bordered flex items-center gap-2'>
          Name
          <input type='text' className='grow' placeholder='Daisy' />
        </label>
        <label className='input input-bordered flex items-center gap-2'>
          Email
          <input type='text' className='grow' placeholder='daisy@site.com' />
        </label>
        <label className='input input-bordered flex items-center gap-2'>
          <input type='text' className='grow' placeholder='Search' />
          <kbd className='kbd kbd-sm'>⌘</kbd>
          <kbd className='kbd kbd-sm'>K</kbd>
        </label>
        <label className='input input-bordered flex items-center gap-2'>
          <input type='text' className='grow' placeholder='Search' />
          <span className='badge badge-info'>Optional</span>
        </label>
      </form>
    );
};

export default LoginForm;
