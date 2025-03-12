'use client';
import React, { useEffect, useState } from 'react';
import { updateSeller } from '@/services/sellerService';
import InputFields from '@/components/auth/register/InputFields';
import { useRouter } from 'next/navigation';
import Loading from '@/components/general/Loading';
import ToggleSwitch from '@/components/availability/ToggleSwitch';
import { IoIosWarning } from 'react-icons/io';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import ImageGrid from '@/components/general/ImageGrid';
import { useSeller } from '@/context/SellerContext';
import { useCheckSeller } from '@/context/SellerContext';

export default function EditSellerPage() {
  const [sellerAvailability, setSellerAvailability] = useState(false);
  const [seller, setSeller] = useState(null);

  const [error, setError] = useState(null);
  const [inappropriateWarning, setInappropriateWarning] = useState(null);
  const router = useRouter();
  const {
    seller: dataSeller,
    setSeller: setDataSeller,
    loading: sellerLoading,
  } = useSeller();
  const { checkedSeller } = useCheckSeller(
    'sellerApproved',
    '/antojos/sellers/approving'
  );

  useEffect(() => {
    if (!sellerLoading) {
      if (dataSeller) {
        setSeller(dataSeller);
        setSellerAvailability(dataSeller.availability);
      }
    }
  }, [dataSeller, sellerLoading]);

  const handleSubmit = async e => {
    e.preventDefault();
    setInappropriateWarning(null);

    // Content moderation check
    const moderationResponse = await fetch('/api/contentDetection/textDetection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `${seller.businessName} ${seller.description} ${seller.slogan}`,
      }),
    });

    const moderationResult = await moderationResponse.json();

    if (moderationResult.data.Sentiment === 'NEGATIVE') {
      setInappropriateWarning('Tu descripción contiene contenido inapropiado. Modifícalo antes de continuar.');
      setLoading(false);
      return; // Stop form submission
    }

    try {
      await updateSeller(seller._id, seller);
      setDataSeller(seller);
      router.push('/');
    } catch (error) {
      setError('Error al actualizar el perfil del vendedor.');
      console.error(error);
    }
  };
  const handleImagesUpdate = updatedImages => {
    setSeller({ ...seller, logo: updatedImages[0] });
  };

  const handleSellerAvailability = async () => {
    try {
      setSellerAvailability(!sellerAvailability);
      setDataSeller({ ...seller, availability: !sellerAvailability });
      const updatedSeller = await updateSeller(seller._id, {
        availability: !sellerAvailability,
      });
      //if the request is not successful, correct the availability
      if (!updatedSeller) {
        setDataSeller({ ...seller, availability: !sellerAvailability });
        setSellerAvailability(!sellerAvailability);
      }
    } catch (error) {
      console.error('Error updating seller availability:', error);
    }
  };
  if (!checkedSeller || !seller) return <Loading />;
  if (error) return <p>{error}</p>;

  return (
    <div className='flex flex-col h-dvh relative'>
        {inappropriateWarning && (
          <dialog id='warning-modal' className='modal modal-open'>
            <div className='modal-box bg-yellow-200 p-3 relative'>
              <button
                className='absolute top-2 right-2 text-yellow-600 text-2xl'
                onClick={() => setInappropriateWarning(null)}
              >
                {/* <IoClose /> */}
                X
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
      <div
        id='register-bg'
        className={`h-1/4 bg-[#393939] flex flex-col justify-center items-center sticky top-0 left-0 overflow-hidden`}
      >
        {/* <Link href='/' className='btn btn-circle absolute top-4 left-4'>
            <TbChevronLeft className='icon' />
          </Link> */}
        <h2 className='text-2xl font-semibold text-white'>Edita tu perfil</h2>
        <p className='text-white'>
          Por favor completa la información del perfil
        </p>
      </div>
      <div className='h-3/4 bg-[#393939]'>
        <div className='bg-white rounded-t-3xl h-max w-full absolute px-6 pt-6 pb-16'>
          <form onSubmit={handleSubmit}>
            <div className='flex flex-col gap-7'>
              <div className='flex justify-between items-center gap-4 p-2 bg-white rounded shadow-md'>
                <div>
                  <h3>Mi disponibilidad</h3>
                  <AvailabilityBadge availability={sellerAvailability} />
                </div>
                <ToggleSwitch
                  isOn={sellerAvailability}
                  onToggle={() => handleSellerAvailability()}
                />
              </div>

              <InputFields
                title='Nombre del Negocio'
                type='text'
                placeholder='Nombre del Negocio'
                value={seller.businessName || ''}
                onChange={e =>
                  setSeller({ ...seller, businessName: e.target.value })
                }
                name='businessName'
                required
              />

              <InputFields
                title='Eslogan'
                type='text'
                placeholder='Eslogan del negocio'
                value={seller.slogan || ''}
                onChange={e => setSeller({ ...seller, slogan: e.target.value })}
                name='slogan'
              />

              <InputFields
                title='Descripción'
                type='textarea'
                name='description'
                placeholder='Descripción del negocio'
                value={seller.description || ''}
                onChange={e =>
                  setSeller({ ...seller, description: e.target.value })
                }
              />

              <InputFields
                title='Usuario de Instagram'
                type='text'
                placeholder='@usuario_instagram'
                value={seller.instagramUser || ''}
                onChange={e =>
                  setSeller({ ...seller, instagramUser: e.target.value })
                }
                name='instagramUser'
              />

              <InputFields
                title='Número de Teléfono'
                type='tel'
                placeholder='Número de contacto'
                value={seller.phoneNumber || ''}
                onChange={e =>
                  setSeller({ ...seller, phoneNumber: e.target.value })
                }
                name='phoneNumber'
                required
              />

              <ImageGrid
                initialImages={seller.logo ? [seller.logo] : []}
                onUpdateImages={handleImagesUpdate}
                nameFolder='sellerlogos'
                title='Logo de tu Negocio o foto de ti'
                maxImages={1}
              />

              <div className='flex justify-end'>
                <button type='submit' className='btn btn-primary'>
                  Guardar Cambios
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
