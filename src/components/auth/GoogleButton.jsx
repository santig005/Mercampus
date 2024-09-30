'use client';

import React from 'react';
import { useSignIn } from '@clerk/nextjs';
import { FcGoogle } from 'react-icons/fc';

export default function GoogleButton() {
  const { isLoaded, signIn } = useSignIn();

  const signInWith = async strategy => {
    try {
      return await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/auth/callback',
        redirectUrlComplete: '/',
      });
    } catch (err) {
      console.error('Error during Google Sign-In:', err);
    }
  };

  const handleSignIn = async () => {
    if (!isLoaded) return; // Espera hasta que Clerk esté listo
    try {
      await signInWith('oauth_google');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <button
        type='button'
        onClick={() => handleSignIn()}
        className='btn w-full disabled:grayscale'
        disabled={!isLoaded}
      >
        <FcGoogle className='icon' />
        Iniciar sesión con Google
      </button>
    </div>
  );
}
