'use client';
import { uploadImages } from '@/services/uploadImages';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TbChevronLeft } from 'react-icons/tb';
import InputFields from '@/components/auth/register/InputFields';
import { FcHighPriority } from 'react-icons/fc';
import { IoClose } from 'react-icons/io5';
import Link from 'next/link';
import ImageGrid from '@/components/general/ImageGrid';
// import { useUser } from '@clerk/nextjs'

const RegisterSeller = () => {
  const router = useRouter();
  const [sellerData, setSellerData] = useState({
    businessName: '',
    instagramUser: '',
    description: '',
    logo: '',
    slogan: '',
    phoneNumber: '',
    images: [],
  });

  // const { user } = useUser()

  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState('');

  const handleChange = e => {
    const { name, value, type, checked } = e.target;

    if (type === 'textarea') {
      requestAnimationFrame(() => {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
      });
    }

    setSellerData({
      ...sellerData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };
  const handleImagesUpdate = updatedImages => {
    setSellerData({ ...sellerData, images: updatedImages });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    sellerData.logo = sellerData.images[0];

    try {
      const response = await fetch('/api/sellers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sellerData),
      });

      if (response.ok) {
        router.push('/antojos/sellers/schedules');
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
    <>
      <div className='flex flex-col h-dvh overflow-hidden'>
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

        {/* content */}
        <div
          id='register-bg'
          className={`h-1/4 bg-[#393939] flex flex-col justify-center items-center overflow-hidden`}
        >
          <Link href='/' className='btn btn-circle absolute top-4 left-4'>
            <TbChevronLeft className='icon' />
          </Link>
          <h2 className='text-2xl font-semibold text-white'>
            Registra tu Negocio
          </h2>
          <p className='text-white'>
            Por favor completa la información de tu negocio
          </p>
        </div>
        <div className='h-full relative bg-[#393939]'>
          <div className='bg-white rounded-t-3xl h-full w-full absolute px-6 pt-6 overflow-hidden overflow-y-auto pb-16'>
            <form onSubmit={handleSubmit}>
              <div className='flex flex-col gap-7'>
                <InputFields
                  title='Nombre del Negocio'
                  type='text'
                  placeholder='Nombre del negocio'
                  value={sellerData.businessName}
                  onChange={handleChange}
                  name='businessName'
                  required
                />
                <InputFields
                  title='Descripción'
                  type='textarea'
                  placeholder='Describe tu negocio'
                  value={sellerData.description}
                  onChange={handleChange}
                  name='description'
                />
                <InputFields
                  title='Slogan'
                  type='text'
                  placeholder='Slogan del negocio'
                  value={sellerData.slogan}
                  onChange={handleChange}
                  name='slogan'
                />
                <InputFields
                  title='Usuario de Instagram'
                  type='text'
                  placeholder='usuario'
                  value={sellerData.instagramUser}
                  onChange={handleChange}
                  name='instagramUser'
                  required
                />
                <InputFields
                  title='Teléfono'
                  type='text'
                  placeholder='Número de teléfono'
                  value={sellerData.phoneNumber}
                  onChange={handleChange}
                  name='phoneNumber'
                  required
                />
                {/* <div>
                  <label>Logo</label>
                  <input
                    type="file"
                    name="images"
                    multiple
                    onChange={(e) =>
                      setSellerData({ ...sellerData, images: [...e.target.files] })
                    }
                    required
                    className="file-input file-input-bordered w-full"
                  />
                </div> */}
                <ImageGrid
                  initialImages={sellerData.images}
                  onUpdateImages={handleImagesUpdate}
                  nameFolder='sellerlogos'
                  title='Logo del Negocio o Foto del vendedor'
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
                    'Registrar Negocio'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterSeller;
