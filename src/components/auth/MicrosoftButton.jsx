'use client';

import React from 'react';
import { useSignIn } from '@clerk/nextjs';
import { FcGoogle } from 'react-icons/fc';
import MicrosoftLogo from '@/../public/images/microsoftLogo.svg';

export default function MicrosoftButton() {
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
      await signInWith('oauth_microsoft');
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MicrosoftLogo.src} alt='' className='size-6' />
        Iniciar sesión con Microsoft
      </button>
    </div>
  );
}
