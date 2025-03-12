/* eslint-disable @next/next/no-img-element */
'use client';
import React, { useRef, useState } from 'react';
import { useAuth, useSignIn } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { TbChevronLeft, TbHeart } from 'react-icons/tb';
import { FcCheckmark, FcHighPriority } from 'react-icons/fc';
//import { IoClose } from 'react-icons/io5';
import InputFields from '@/components/auth/register/InputFields';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import ForgotPasswordImg from '@/../public/images/forgot_password.svg';

export default function ForgotPassword({ setForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successfulCreation, setSuccessfulCreation] = useState(false);
  const [secondFactor, setSecondFactor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState(false);
  const [parent] = useAutoAnimate();

  // Refs para cada input
  const codeInputRefs = useRef([]);
  const [code, setCode] = useState('');

  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [passwordSecurity, setPasswordSecurity] = useState({
    length: false,
    number: false,
    specialCharacter: false,
    uppercase: false,
    lowercase: false,
  });

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
    form_param_format_invalid: 'Ingresa un correo electrónico válido',
    verification_expired:
      'El código de verificación ha expirado, solicita uno nuevo',
    form_conditional_param_value_disallowed:
      'No puedes cambiar la contraseña de un correo registrado con Google o Microsoft',
    form_conditional_param_missing: 'Ha ocurrido un error, intenta de nuevo',
  };

  const [isPasswordMatch, setIsPasswordMatch] = useState({
    match: false,
    onFalse: 'border-transparent',
    onTrue: 'border-green-500',
  });

  if (!isLoaded) {
    return null;
  }

  // If the user is already signed in,
  // redirect them to the home page
  if (isSignedIn) {
    router.push('/');
  }

  const checkPasswordSecurity = password => {
    setPassword(password);
    if (password === confirmPassword) {
      setIsPasswordMatch({ ...isPasswordMatch, match: true });
    } else {
      setIsPasswordMatch({ ...isPasswordMatch, match: false });
    }

    const newSecurity = {
      length: password.length >= 8,
      number: /[0-9]/.test(password),
      specialCharacter: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
    };

    setPasswordSecurity(newSecurity);
  };

  const verifyPassword = e => {
    const confirmPassword = e;
    setConfirmPassword(confirmPassword);

    if (password === confirmPassword) {
      setIsPasswordMatch({ ...isPasswordMatch, match: true });
    } else {
      setIsPasswordMatch({ ...isPasswordMatch, match: false });
    }
  };

  // Send the password reset code to the user's email
  async function create(e) {
    setLoading(true);
    e.preventDefault();
    await signIn
      ?.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      })
      .then(_ => {
        setSuccessfulCreation(true);
        setError('');
      })
      .catch(err => {
        // setError(err.errors[0].longMessage);
        setError(
          passwordErrorMessages[
            JSON.stringify(err.errors[0].code, null, 2).replace(/['"]+/g, '')
          ] || JSON.stringify(err, null, 2)
        );
      });
    setLoading(false);
  }

  // Reset the user's password.
  // Upon successful reset, the user will be
  // signed in and redirected to the home page
  async function reset(e) {
    setLoading(true);
    e.preventDefault();
    await signIn
      ?.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      })
      .then(result => {
        // Check if 2FA is required
        if (result.status === 'needs_second_factor') {
          setSecondFactor(true);
          setError('');
        } else if (result.status === 'complete') {
          setVerification(true);
          // Set the active session to
          // the newly created session (user is now signed in)
          setActive({ session: result.createdSessionId });
          setError('');
        } else {
          console.log(result);
        }
      })
      .catch(err => {
        setError(
          passwordErrorMessages[
            JSON.stringify(err.errors[0].code, null, 2).replace(/['"]+/g, '')
          ] || JSON.stringify(err, null, 2)
        );
      });
    setLoading(false);
  }

  // Manejar el cambio en los inputs
  const handleInput = (e, index) => {
    const value = e.target.value.slice(0, 1); // Solo permitir un dígito
    if (!/^\d*$/.test(value)) return; // Solo permitir números

    // Actualizar la cadena completa del código
    const newCodeArray = code.split('');
    newCodeArray[index] = value;
    const newCode = newCodeArray.join('');
    setCode(newCode);

    // Mover el foco al siguiente input si no es el último
    if (value && index < 5) {
      codeInputRefs.current[index + 1].focus();
    }

    // Verificar si todos los campos están completos y enviar el código automáticamente
    // if (newCode.length === 6 && !newCode.includes('')) {
    //   handleVerify(newCode); // Llama a la función de verificación pasando el código
    // }
  };

  // Manejar el pegado de texto
  const handlePaste = e => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 6); // Solo obtener los primeros 6 caracteres
    setCode(pasteData);

    // Llenar los inputs con los valores pegados
    pasteData.split('').forEach((char, i) => {
      if (codeInputRefs.current[i]) {
        codeInputRefs.current[i].value = char;
      }
    });

    // Enfocar el último input pegado
    const lastIndex = Math.min(pasteData.length - 1, 5);
    codeInputRefs.current[lastIndex].focus();
  };

  // Manejar las teclas (borrar y moverse)
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1].focus();
    }
  };

  return (
    <div>
      <dialog id='forgot_password' className='modal modal-open modal-bottom'>
        <div className='modal-box w-full h-dvh rounded-none bg-primary p-0 relative'>
          <div className='absolute w-full z-10'>
            <div className='modal-action m-0 justify-between p-4'>
              <form method='dialog'>
                <button
                  className='btn btn-circle'
                  onClick={() => setForgotPassword(false)}
                >
                  <TbChevronLeft className='icon' />
                </button>
              </form>
            </div>
          </div>

          <div
            className='h-1/4 bg-[#393939] flex flex-col justify-center items-center'
            id='register-bg'
          >
            <h2 className='text-2xl font-semibold text-white'>
              ¿Olvidaste tu contraseña?
            </h2>
            <p className='text-white'>Por favor ingresa tu correo</p>
          </div>

          <div className='relative h-auto w-full'>
            <div className='bg-primary rounded-t-3xl w-full absolute -top-8 flex flex-col gap-2 pt-2'>
              <div className='flex flex-col p-6 gap-2'>
                {/*! forgot pass */}
                <div>
                  <form onSubmit={!successfulCreation ? create : reset}>
                    {!successfulCreation && (
                      <div className='flex flex-col gap-4'>
                        <InputFields
                          title='Correo electrónico'
                          type='email'
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder='johndoe@gmail.com'
                          required
                        />
                        <p className='py-2 text-xs'>
                          Ingresa tu correo electrónico y te enviaremos un
                          código de verificación para restablecer tu contraseña
                        </p>

                        <button
                          type='submit'
                          className='btn btn-primary w-full'
                          disabled={email.length === 0 || loading}
                        >
                          {loading ? (
                            <span className='loading loading-infinity loading-lg'></span>
                          ) : (
                            'Enviar código de verificación'
                          )}
                        </button>
                        <div className='mt-8'>
                          <img src={ForgotPasswordImg.src} alt='' />
                        </div>
                      </div>
                    )}

                    {successfulCreation && (
                      <div className='flex flex-col gap-4'>
                        <div className='flex flex-col gap-2' ref={parent}>
                          <InputFields
                            title='Contraseña'
                            type='password'
                            placeholder='********'
                            value={password}
                            secureText={true}
                            onChange={e =>
                              checkPasswordSecurity(e.target.value)
                            }
                            className={`border ${
                              isPasswordMatch.match && password.length > 0
                                ? isPasswordMatch.onTrue
                                : isPasswordMatch.onFalse
                            }`}
                            required
                          />
                          {password.length > 0 && (
                            <ul className=''>
                              <li
                                className={`flex items-center gap-1 ${
                                  passwordSecurity.length
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {passwordSecurity.length ? (
                                  <FcCheckmark />
                                ) : (
                                  <FcHighPriority />
                                )}{' '}
                                Al menos 8 caracteres
                              </li>
                              <li
                                className={`flex items-center gap-1 ${
                                  passwordSecurity.number
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {passwordSecurity.number ? (
                                  <FcCheckmark />
                                ) : (
                                  <FcHighPriority />
                                )}{' '}
                                Al menos un número
                              </li>
                              <li
                                className={`flex items-center gap-1 ${
                                  passwordSecurity.uppercase
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {passwordSecurity.uppercase ? (
                                  <FcCheckmark />
                                ) : (
                                  <FcHighPriority />
                                )}{' '}
                                Al menos una mayúscula
                              </li>
                              {/* <li
                                className={`flex items-center gap-1 ${
                                  passwordSecurity.specialCharacter
                                    ? 'text-green-400'
                                    : 'text-red-400'
                                }`}
                              >
                                {passwordSecurity.specialCharacter ? (
                                  <FcCheckmark />
                                ) : (
                                  <FcHighPriority />
                                )}{' '}
                                Al menos un carácter especial (@$!%*?&)
                              </li> */}
                            </ul>
                          )}
                        </div>

                        <div className='flex flex-col gap-2' ref={parent}>
                          <InputFields
                            title='Repetir contraseña'
                            type='password'
                            placeholder='********'
                            value={confirmPassword}
                            secureText={true}
                            onChange={e => verifyPassword(e.target.value)}
                            className={`border ${
                              isPasswordMatch.match &&
                              confirmPassword.length > 0
                                ? isPasswordMatch.onTrue
                                : isPasswordMatch.onFalse
                            }`}
                          />
                          {!isPasswordMatch.match &&
                            confirmPassword.length > 0 && (
                              <p className='text-red-400'>
                                Las contraseñas no coinciden
                              </p>
                            )}
                        </div>
                        <div className='flex flex-col'>
                          <p className='py-2 text-xs'>
                            Al correo{' '}
                            <span className='text-green-500'>{email}</span> ha
                            sido enviado un código de verificación de 6 dígitos,
                            ingresalo a continuación
                          </p>
                          <div className='flex gap-2 justify-center mt-4'>
                            {[0, 1, 2, 3, 4, 5].map(index => (
                              <input
                                className='text-2xl size-12 p-2 rounded-lg border border-gray-300 focus-within:outline-0 focus-within:shadow-md focus-within:border-primary text-center'
                                key={index}
                                type='number'
                                maxLength={1}
                                onChange={e => handleInput(e, index)}
                                ref={el => (codeInputRefs.current[index] = el)}
                                value={code[index] || ''} // Mostrar el valor actual en cada input
                                // autoFocus={index === 0}
                                onKeyDown={e => handleKeyDown(e, index)}
                                onPaste={handlePaste}
                                disabled={loading}
                              />
                            ))}
                          </div>
                        </div>

                        <button
                          type='submit'
                          className='btn btn-primary w-full'
                          disabled={
                            password.length === 0 ||
                            code.length < 6 ||
                            loading ||
                            !isPasswordMatch.match ||
                            !passwordSecurity.length ||
                            !passwordSecurity.number ||
                            !passwordSecurity.uppercase
                          }
                        >
                          {loading ? (
                            <span className='loading loading-infinity loading-lg'></span>
                          ) : (
                            'Restablecer contraseña'
                          )}
                        </button>
                        {verification && (
                          <p className='py-2 text-xs'>
                            <span className='text-green-500'>
                              Su contraseña ha sido restablecida con éxito
                            </span>
                          </p>
                        )}
                      </div>
                    )}

                    {secondFactor && (
                      <p>2FA is required, but this UI does not handle that</p>
                    )}
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </dialog>

      {/* Errors modal */}
      <dialog id='errors' className={`modal ${error ? 'modal-open' : ''}`}>
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
                  <button className='font-normal' onClick={() => setError('')}>
                    {/* <IoClose className='text-red-400 text-2xl' /> */}
                    X
                  </button>
                </form>
              </h3>
              <p className='py-2'>{error}</p>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}
