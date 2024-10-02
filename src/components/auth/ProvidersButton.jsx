/* eslint-disable @next/next/no-img-element */
'use client';

import * as React from 'react';
import { useSignIn, useSignUp } from '@clerk/nextjs';
import { FcGoogle } from 'react-icons/fc';
import MicrosoftLogo from '@/../public/images/microsoftLogo.svg';

// 'use client';

// import React from 'react';
// import { useSignIn } from '@clerk/nextjs';
// import { FcGoogle } from 'react-icons/fc';
// import MicrosoftLogo from '@/../public/images/microsoftLogo.svg';

// export default function ProvidersButton() {
//   const url = process.env.NEXT_PUBLIC_URL;
//   const { isLoaded, signIn } = useSignIn();

//   const signInWith = async strategy => {
//     try {
//       return await signIn.authenticateWithRedirect({
//         strategy,
//         redirectUrl: `${url}/auth/callback`,
//         redirectUrlComplete: `${url}/`,
//       });
//     } catch (err) {
//       console.error('Error during Google Sign-In:', err);
//     }
//   };

//   const handleSignIn = async provider => {
//     if (!isLoaded) return; // Espera hasta que Clerk esté listo
//     try {
//       await signInWith(provider);
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   return (
//     <div className='flex flex-col gap-3'>
//       <button
//         type='button'
//         onClick={() => handleSignIn('oauth_google')}
//         className='btn w-full disabled:grayscale'
//         disabled={!isLoaded}
//       >
//         <FcGoogle className='icon' />
//         Iniciar sesión con Google
//       </button>
//       <button
//         type='button'
//         onClick={() => handleSignIn('oauth_microsoft')}
//         className='btn w-full disabled:grayscale'
//         disabled={!isLoaded}
//       >
//         <img src={MicrosoftLogo.src} alt='' className='size-6' />
//         Iniciar sesión con Microsoft
//       </button>
//     </div>
//   );
// }

export default function ProvidersButton() {
  const url = process.env.NEXT_PUBLIC_URL;
  const { signIn } = useSignIn();
  const { signUp, setActive, isLoaded } = useSignUp();

  // if (!signIn || !signUp) return;

  const signInWith = strategy => {
    return signIn.authenticateWithRedirect({
      strategy,
      redirectUrl: `/auth/callback`,
      redirectUrlComplete: `/`,
    });
  };

  async function handleSignIn(strategy) {
    if (!signIn || !signUp) return;
    if (!isLoaded) return; // Espera hasta que Clerk esté listo

    // If the user has an account in your application, but does not yet
    // have an OAuth account connected to it, you can transfer the OAuth
    // account to the existing user account.
    const userExistsButNeedsToSignIn =
      signUp.verifications.externalAccount.status === 'transferable' &&
      signUp.verifications.externalAccount.error?.code ===
        'external_account_exists';

    if (userExistsButNeedsToSignIn) {
      const res = await signIn.create({ transfer: true });

      if (res.status === 'complete') {
        setActive({
          session: res.createdSessionId,
        });
      }
    }

    // If the user has an OAuth account but does not yet
    // have an account in your app, you can create an account
    // for them using the OAuth information.
    const userNeedsToBeCreated =
      signIn.firstFactorVerification.status === 'transferable';

    if (userNeedsToBeCreated) {
      const res = await signUp.create({
        transfer: true,
      });

      if (res.status === 'complete') {
        setActive({
          session: res.createdSessionId,
        });
      }
    } else {
      // If the user has an account in your application
      // and has an OAuth account connected to it, you can sign them in.
      signInWith(strategy);
    }
  }

  // Render a button for each supported OAuth provider
  // you want to add to your app. This example uses only Google.
  return (
    <div className='flex flex-col gap-3'>
      <button
        type='button'
        onClick={() => handleSignIn('oauth_google')}
        className='btn w-full disabled:grayscale'
        disabled={!isLoaded}
      >
        <FcGoogle className='icon' />
        Iniciar sesión con Google
      </button>
      <button
        type='button'
        onClick={() => handleSignIn('oauth_microsoft')}
        className='btn w-full disabled:grayscale'
        disabled={!isLoaded}
      >
        <img src={MicrosoftLogo.src} alt='' className='size-6' />
        Iniciar sesión con Microsoft
      </button>
    </div>
  );
}
