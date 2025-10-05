'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import InputFields from '@/components/auth/register/InputFields';
import ImageGrid from '@/components/general/ImageGrid';
import Loading from '@/components/general/Loading';
import { useUser } from '@clerk/nextjs';

const RegisterLandlord = () => {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  
  const [landlordData, setLandlordData] = useState({
    name: '',
    description: '',
    phoneNumber: '',
    images: [],
  });
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState('');

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/auth/login?redirect_url=' + window.location.pathname);
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <Loading />;
  }

  const handleChange = e => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'phoneNumber') {
      newValue = value.replace(/\D/g, '').slice(0, 10);
    }

    if (name) {
      setLandlordData({
        ...landlordData,
        [name]: newValue,
      });
    }
  };

  const handleImagesUpdate = updatedImages => {
    setLandlordData({ ...landlordData, images: updatedImages });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/landlords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(landlordData),
      });

      if (response.ok) {
        router.push('/landlords');
      } else {
        const errorData = await response.json();
        console.error('Error:', errorData.message);
        setErrorCode(errorData.message);
      }
    } catch (error) {
      console.error('Network Error:', error);
      setErrorCode('Network Error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className='h-[836px] relative'>
      <div className='h-1/4 sticky top-0 left-0'>
        <div
          id='register-bg'
          className='bg-[#393939] h-full flex flex-col justify-center items-center overflow-hidden'
        >
          <h2 className='text-2xl font-semibold text-white'>
            Regístrate como Arrendador
          </h2>
          <p className='text-white'>
            Por favor completa tu información personal
          </p>
        </div>
      </div>
      <div className='h-3/4'>
        <div className='relative bg-[#393939]'>
          <div className='bg-white rounded-t-3xl h-max w-full px-6 pt-6 pb-16'>
            <form onSubmit={handleSubmit}>
              <div className='flex flex-col gap-7'>
                <InputFields
                  title='Tu Nombre'
                  type='text'
                  placeholder='Ej: María Rodríguez'
                  value={landlordData.name}
                  onChange={handleChange}
                  name='name'
                  required
                />
                <InputFields
                  title='Preséntate'
                  type='textarea'
                  placeholder='Ej: Mi nombre es María y tengo habitaciones disponibles en el barrio X y el barrio Y.'
                  value={landlordData.description}
                  onChange={handleChange}
                  name='description'
                  required
                />
                <InputFields
                  title='Teléfono de Contacto'
                  type='tel'
                  placeholder='Número de teléfono'
                  value={landlordData.phoneNumber}
                  onChange={handleChange}
                  name='phoneNumber'
                  required
                />
                <ImageGrid
                  initialImages={landlordData.images}
                  onUpdateImages={handleImagesUpdate}
                  nameFolder='landlordimages'
                  title='Sube una foto tuya'
                  maxImages={1}
                />
                <button
                  type='submit'
                  className='btn btn-primary w-full'
                  disabled={loading}
                >
                  {loading ? (
                    <span className='loading loading-infinity loading-lg'></span>
                  ) : (
                    'Finalizar Registro'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterLandlord;
