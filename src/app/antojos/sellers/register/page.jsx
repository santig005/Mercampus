'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import InputFields from '@/components/auth/register/InputFields';
import { FcHighPriority } from 'react-icons/fc';
//import { IoClose } from 'react-icons/io5';
import { IoIosWarning } from 'react-icons/io';
import ImageGrid from '@/components/general/ImageGrid';
import Loading from '@/components/general/Loading';
import { useCheckSeller } from '@/context/SellerContext';
import { useSeller } from '@/context/SellerContext';

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
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [inappropriateWarning, setInappropriateWarning] = useState(null);
  var { seller, setSeller, dbUser, setDbUser } = useSeller();
  const { checkedSeller } = useCheckSeller('userNotSeller', '');
  if (!checkedSeller) return <Loading />;

  const handleChange = e => {
    const { name, value, type, checked } = e.target;

    let newValue = type === 'checkbox' ? checked : value;

    // Si el campo es "phone", limpiamos el número antes de guardarlo
    if (name === 'phoneNumber') {
      newValue = value.replace(/\D/g, '').slice(0, 10); // Solo números, máx. 10 dígitos
    }

    if (name) {
      setSellerData({
        ...sellerData,
        [name]: newValue,
      });
    }
  };

  const handleImagesUpdate = updatedImages => {
    setSellerData({ ...sellerData, images: updatedImages });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setInappropriateWarning(null);

    // Content moderation check
    const moderationResponse = await fetch('/api/contentDetection/textDetection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `${sellerData.businessName} ${sellerData.description} ${sellerData.slogan}`,
      }),
    });

    const moderationResult = await moderationResponse.json();

    if (moderationResult.data.Sentiment === 'NEGATIVE') {
      setInappropriateWarning('Contenido inapropiado detectado. Modifícalo antes de continuar.');
      setLoading(false);
      return; // Stop form submission
    }

    sellerData.logo = sellerData?.images[0];
    sellerData.description = JSON.stringify(sellerData.description);
    // console.log(sellerData);

    try {
      const response = await fetch('/api/sellers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sellerData),
      });

      if (response.ok) {
        setSeller(sellerData);
        setDbUser({ ...dbUser, role: 'seller' });
        router.push('/antojos/sellers/approving');
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
      {inappropriateWarning && (
        <dialog id='warning-modal' className='modal modal-open'>
          <div className='modal-box bg-yellow-200 p-3 relative'>
            <button
              className='absolute top-2 right-2 text-yellow-600 text-2xl'
              onClick={() => setInappropriateWarning(null)}
            >
              X
              {/* <IoClose /> */}
            </button>
            <div className='flex items-center gap-3 w-full'>
              <IoIosWarning className='text-yellow-600 text-4xl' />
              <div className='w-full'>
                <h3 className='font-bold text-lg text-center'>Advertencia</h3>
                <p className='py-2'>{inappropriateWarning}</p>
              </div>
            </div>
          </div>
        </dialog>
      )}

      <div className='h-1/4 sticky top-0 left-0'>
        <div id='register-bg' className='bg-[#393939] h-full flex flex-col justify-center items-center overflow-hidden'>
          <h2 className='text-2xl font-semibold text-white'>Registra tu Negocio</h2>
          <p className='text-white'>Por favor completa la información de tu negocio</p>
        </div>
      </div>
      <div className='h-3/4'>
        <div className='relative bg-[#393939]'>
          <div className='bg-white rounded-t-3xl h-max w-full px-6 pt-6 pb-16'>
            <form onSubmit={handleSubmit}>
              <div className='flex flex-col gap-7'>
                <InputFields title='Nombre del Negocio' type='text' placeholder='Nombre del negocio' value={sellerData.businessName} onChange={handleChange} name='businessName' required />
                <InputFields title='Descripción' type='textarea' placeholder='Describe tu negocio' value={sellerData.description} onChange={handleChange} name='description' required />
                <InputFields title='Slogan' type='text' placeholder='Slogan del negocio' value={sellerData.slogan} onChange={handleChange} name='slogan' />
                <InputFields title='Usuario de Instagram' type='text' placeholder='usuario' value={sellerData.instagramUser} onChange={handleChange} name='instagramUser' />
                <InputFields title='Teléfono' type='tel' placeholder='Número de teléfono' value={sellerData.phoneNumber} onChange={handleChange} name='phoneNumber' required />
                <ImageGrid initialImages={sellerData.images} onUpdateImages={handleImagesUpdate} nameFolder='sellerlogos' title='Logo del Negocio o Foto del vendedor' maxImages={1} />
                <button type='submit' className='btn btn-primary w-full' disabled={loading}>
                  {loading ? <span className='loading loading-infinity loading-lg'></span> : 'Registrar Negocio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterSeller;