'use client';

import React, { useState } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import ProvidersButton from '@/components/auth/ProvidersButton';
import { TbChevronLeft } from 'react-icons/tb';
import InputFields from '@/components/auth/register/InputFields';
import { FcHighPriority } from 'react-icons/fc';
import { IoClose } from 'react-icons/io5';
import ForgotPassword from '@/components/auth/ForgotPassword';
import Link from 'next/link';

export default function SignInForm() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);

  const passwordErrorMessages = {
    form_password_length_too_short:
      'La contraseña debe tener al menos 8 caracteres',
    form_password_must_contain_number:
      'La contraseña debe contener al menos un número',
    form_password_must_contain_special_character:
      'La contraseña debe contener al menos un carácter especial',
    form_password_must_contain_uppercase:
      'La contraseña debe contener al menos una mayúscula',
    form_password_must_contain_lowercase:
      'La contraseña debe contener al menos una minúscula',
    form_password_pwned: 'La contraseña es insegura',
    form_identifier_exists:
      'El correo electrónico ingresado ya está registrado',
    form_param_nil: 'Ingresa tu apellido por favor',
    client_state_invalid: 'El estado del cliente es inválido',
    form_code_incorrect: 'El código de verificación es incorrecto',
    verification_failed: 'La verificación ha fallado',
    form_password_incorrect: 'La contraseña es incorrecta',
    form_identifier_not_found:
      'El correo electrónico no se encuentra registrado',
    session_not_found: 'La sesión no se encuentra registrada',
    session_exists:
      'Ya has iniciado sesión, si quieres cambiar de cuenta, cierra sesión primero',
    strategy_for_user_invalid:
      'Al parecer ya has creado una cuenta con google o microsoft, intenta iniciar sesión con el mismo proveedor',
  };

  // Handle the submission of the sign-in form
  const handleSubmit = async e => {
    setLoading(true);
    e.preventDefault();

    if (!isLoaded) {
      return;
    }

    // Start the sign-in process using the email and password provided
    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        password,
      });

      // If sign-in process is complete, set the created session as active
      // and redirect the user
      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        router.push('/');
      } else {
        // If the status is not complete, check why. User may need to
        // complete further steps.
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2));
      setErrorCode(
        passwordErrorMessages[
          JSON.stringify(err.errors[0].code, null, 2).replace(/['"]+/g, '')
        ] || JSON.stringify(err, null, 2)
      );
    }
    setLoading(false);
  };
  return (
    <>
      {/* <h1>Sign in</h1>
      <form onSubmit={e => handleSubmit(e)}>
        <div>
          <label htmlFor='email'>Enter email address</label>
          <input
            onChange={e => setEmail(e.target.value)}
            id='email'
            name='email'
            type='email'
            value={email}
          />
        </div>
        <div>
          <label htmlFor='password'>Enter password</label>
          <input
            onChange={e => setPassword(e.target.value)}
            id='password'
            name='password'
            type='password'
            value={password}
          />
        </div>
        <button type='submit'>Sign in</button>
      </form> */}
      <div className='flex flex-col h-dvh'>
        {/* Errors modal */}
        <dialog
          id='errors'
          className={`modal ${errorCode ? 'modal-open' : ''}`}
        >
          <div className='modal-box bg-[#fde6e6] p-3'>
            <div className='flex justify-start items-center gap-3 w-full'>
              <div className=''>
                <FcHighPriority className='text-red-400 text-4xl' />
              </div>
              <div className='w-full'>
                <h3 className='font-bold text-lg flex justify-between'>
                  ¡Atención!
                  <form method='dialog'>
                    {/* if there is a button in form, it will close the modal */}
                    <button
                      className='font-normal'
                      onClick={() => setErrorCode('')}
                    >
                      <IoClose className='text-red-400 text-2xl' />
                    </button>
                  </form>
                </h3>
                <p className='py-2'>{errorCode}</p>
              </div>
            </div>
          </div>
        </dialog>

        {/* Forgot password */}
        {forgotPassword && (
          <ForgotPassword setForgotPassword={setForgotPassword} />
        )}

        {/* content */}
        <div
          id='register-bg'
          className={`h-1/4 bg-[#393939] flex flex-col justify-center items-center`}
        >
          <Link href='/' className='btn btn-circle absolute top-4 left-4'>
            <TbChevronLeft className='icon' />
          </Link>
          <h2 className='text-2xl font-semibold text-white'>Inicia Sesión</h2>
          <p className='text-white'>
            Por favor ingresa a tu cuenta para continuar
          </p>
        </div>
        <div className='h-full relative bg-[#393939]'>
          <div className='bg-white rounded-t-3xl h-full w-full absolute px-6 pt-6 overflow-hidden overflow-y-auto pb-16'>
            <form onSubmit={handleSubmit}>
              <div className='flex flex-col gap-7'>
                <InputFields
                  title='Correo electrónico'
                  type='email'
                  placeholder='johndoe@gmail.com'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <InputFields
                  title='Contraseña'
                  type='password'
                  placeholder='********'
                  secureText={true}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />

                <button
                  type='submit'
                  className='btn btn-primary w-full'
                  disabled={
                    email.length === 0 || password.length === 0 || loading
                  }
                >
                  {loading ? (
                    <span className='loading loading-infinity loading-lg'></span>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </button>
                <div className='flex justify-center'>
                  <button
                    type='button'
                    className='text-center text-primary'
                    onClick={() => setForgotPassword(true)}
                  >
                    <span className='text-black'>
                      ¿Has olvidado tu contraseña?
                    </span>{' '}
                    Recupérala
                  </button>
                </div>
              </div>
            </form>
            <div className='divider my-6'>O también puedes</div>
            <div className='flex flex-col gap-3'>
              <ProvidersButton />
            </div>
            <div className='mt-4 flex justify-center'>
              <Link href='/auth/register' className='text-center text-primary'>
                <span className='text-black'>¿No tienes una cuenta?</span> Crea
                una
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
