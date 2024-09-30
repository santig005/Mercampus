'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import GoogleButton from '@/components/auth/GoogleButton';
import InputFields from '@/components/auth/register/InputFields';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { TbChevronLeft } from 'react-icons/tb';
import { Link } from 'next-view-transitions';
import { FcCheckmark } from 'react-icons/fc';
import { FcHighPriority } from 'react-icons/fc';
import { IoClose } from 'react-icons/io5';

export default function SignUpForm() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [userName, setUserName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordMatch, setIsPasswordMatch] = useState({
    match: false,
    onFalse: 'border-transparent',
    onTrue: 'border-green-500',
  });
  // const [code, setCode] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const router = useRouter();
  const [passwordSecurity, setPasswordSecurity] = useState({
    length: false,
    number: false,
    specialCharacter: false,
    uppercase: false,
    lowercase: false,
  });
  const [parent] = useAutoAnimate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState(false);

  // Refs para cada input
  const codeInputRefs = useRef([]);
  const [code, setCode] = useState('');

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
    form_identifier_not_found:
      'El correo electrónico no se encuentra registrado',
    session_not_found: 'La sesión no se encuentra registrada',
    session_exists:
      'Ya has iniciado sesión, si quieres registrarte con otra cuenta, cierra sesión primero',
  };

  const createUserDb = async () => {
    try {
      fetch(`/api/register`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: userName,
          email: emailAddress,
        }),
      });
    } catch (err) {
      console.error(err.message);
    }
  };

  // Handle submission of the sign-up form
  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    if (!isLoaded) return;

    // Start the sign-up process using the email and password provided
    try {
      if (password !== confirmPassword) {
        setErrorCode('Las contraseñas no coinciden');
        return;
      }
      await signUp.create({
        firstName: userName.split(' ')[0],
        lastName: userName.split(' ')[1] || '',
        emailAddress,
        password,
      });

      // Send the user an email with the verification code
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });

      // Set 'verifying' true to display second form
      // and capture the OTP code
      setVerifying(true);
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      setErrorCode(
        passwordErrorMessages[
          JSON.stringify(err.errors[0].code, null, 2).replace(/['"]+/g, '')
        ] || JSON.stringify(err, null, 2)
      );
    }
    setLoading(false);
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

  // Handle the submission of the verification form
  const handleVerify = async e => {
    if (code.length < 6) {
      setErrorCode('Ingresa el código de verificación');
      return;
    }
    // e.preventDefault();
    try {
      setLoading(true);

      if (!isLoaded) return;
      // Use the code the user provided to attempt verification
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      // If verification was completed, set the session to active
      // and redirect the user
      if (completeSignUp.status === 'complete') {
        setVerification(true);
        await createUserDb();
        await setActive({ session: completeSignUp.createdSessionId });
        router.push('/');
      } else {
        // If the status is not complete, check why. User may need to
        // complete further steps.
        console.error(JSON.stringify(completeSignUp, null, 2));
      }
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error('Error:', JSON.stringify(err, null, 2));
      console.log(err);
      setErrorCode(
        passwordErrorMessages[
          JSON.stringify(err.errors[0].code, null, 2).replace(/['"]+/g, '')
        ] || JSON.stringify(err, null, 2)
      );
    }
    setLoading(false);
  };

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
    <>
      <div className='flex flex-col h-dvh'>
        {/* Verification modal */}
        {verifying && (
          <dialog id='errors' className={`modal modal-open`}>
            <div className='modal-box' ref={parent}>
              <h3 className='font-bold text-lg text-center'>
                Ingrese código de verificación
              </h3>
              <p className='py-2 text-xs'>
                Al correo <span className='text-green-500'>{emailAddress}</span>{' '}
                ha sido enviado un código de verificación de 6 dígitos,
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
                    autoFocus={index === 0}
                    onKeyDown={e => handleKeyDown(e, index)}
                    onPaste={handlePaste}
                    disabled={loading}
                  />
                ))}
              </div>
              <button
                type='button'
                className='btn btn-primary mt-4 w-full'
                onClick={() => handleVerify(code)} // Aquí también se pasa el código
                disabled={loading}
              >
                {loading ? (
                  <span className='loading loading-infinity loading-lg'></span>
                ) : (
                  'Verificar'
                )}
              </button>
              {verification && (
                <p className='py-2 text-xs'>
                  <span className='text-green-500'>
                    Su correo ha sido verificado correctamente
                  </span>
                </p>
              )}
            </div>
          </dialog>
        )}

        {/* Errors modal */}
        <dialog
          id='errors'
          className={`modal ${errorCode ? 'modal-open' : ''}`}
        >
          <div className='modal-box bg-[#fde6e6] p-3'>
            <div className='flex justify-center items-center gap-3'>
              <div className=''>
                <FcHighPriority className='text-red-400 text-4xl' />
              </div>
              <div className=''>
                <h3 className='font-bold text-lg flex items-center justify-between'>
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

        {/* content */}
        <div
          id='register-bg'
          className={`h-1/4 bg-[#393939] flex flex-col justify-center items-center`}
        >
          <Link href='/' className='btn btn-circle absolute top-4 left-4'>
            <TbChevronLeft className='icon' />
          </Link>
          <h2 className='text-2xl font-semibold text-white'>Regístrate</h2>
          <p className='text-white'>Por favor regístrate para comenzar</p>
        </div>
        <div className='h-full relative bg-[#393939]'>
          <div className='bg-white rounded-t-3xl h-full w-full absolute px-6 pt-6 overflow-hidden overflow-y-auto pb-16'>
            <form onSubmit={handleSubmit}>
              <div className='flex flex-col gap-7'>
                <InputFields
                  title='Nombre completo'
                  type='text'
                  placeholder='John Doe'
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  required
                />
                <InputFields
                  title='Correo electrónico'
                  type='email'
                  placeholder='johndoe@gmail.com'
                  value={emailAddress}
                  onChange={e => setEmailAddress(e.target.value)}
                  required
                />
                <div className='flex flex-col gap-2' ref={parent}>
                  <InputFields
                    title='Contraseña'
                    type='password'
                    placeholder='********'
                    value={password}
                    secureText={true}
                    onChange={e => checkPasswordSecurity(e.target.value)}
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
                      <li
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
                      </li>
                    </ul>
                  )}
                </div>
                {/* <p></p> */}

                <div className='flex flex-col gap-2' ref={parent}>
                  <InputFields
                    title='Repetir contraseña'
                    type='password'
                    placeholder='********'
                    value={confirmPassword}
                    secureText={true}
                    onChange={e => verifyPassword(e.target.value)}
                    className={`border ${
                      isPasswordMatch.match && confirmPassword.length > 0
                        ? isPasswordMatch.onTrue
                        : isPasswordMatch.onFalse
                    }`}
                  />
                  {!isPasswordMatch.match && confirmPassword.length > 0 && (
                    <p className='text-red-400'>Las contraseñas no coinciden</p>
                  )}
                </div>

                <button
                  type='submit'
                  className='btn btn-primary'
                  disabled={
                    !passwordSecurity.length ||
                    !passwordSecurity.number ||
                    !passwordSecurity.specialCharacter ||
                    !passwordSecurity.uppercase ||
                    !isPasswordMatch.match ||
                    loading
                  }
                >
                  {loading ? (
                    <span className='loading loading-infinity loading-lg'></span>
                  ) : (
                    'Registrarse'
                  )}
                </button>
              </div>
            </form>
            <div className='divider'>O también puedes</div>
            <div className='flex flex-col'>
              <GoogleButton />
            </div>
            <div className='mt-4 flex justify-center'>
              <Link href='/auth/login' className='text-center text-primary'>
                <span className='text-black'>¿Ya tienes una cuenta?</span>{' '}
                Inicia sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
