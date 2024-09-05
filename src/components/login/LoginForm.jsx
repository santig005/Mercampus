import React from 'react';

const LoginForm = () => {
    return (
        <form className="flex justify-center items-center h-screen">
            <h1>Este es el login a la mejor red universitaria</h1>
            <div className='bg-red-400 flex flex-col items-center'>
                <label htmlFor="email">Email:</label>
                <input className='bg-red-400 rounded-xl text-white text-lg'
                    type="email"
                    id="email"
                />
            </div>
            <div className='mt-4'>
                <label htmlFor="password">Password:</label>
                <input
                    type="password"
                    id="password"
                    className='bg-red-400 rounded-xl text-white text-lg'
                />
            </div>
            <button type="submit">Submit</button>
        </form>
    );
};

export default LoginForm;
