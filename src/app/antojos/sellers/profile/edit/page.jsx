'use client';
import React, { useEffect, useState } from 'react';
import { updateSeller } from '@/services/sellerService';
import InputFields from '@/components/auth/register/InputFields';
import { useRouter } from 'next/navigation';
import Loading from '@/components/general/Loading';
import ExtraTimeBadge2 from '@/components/availability/extraTimeBadge2';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import ImageGrid from '@/components/general/ImageGrid';
import { useSeller } from '@/context/SellerContext';
import { useCheckSeller } from '@/context/SellerContext';

export default function EditSellerPage() {
  const [sellerAvailability, setSellerAvailability] = useState(false);
  const [sellerExtraTime, setSellerExtraTime] = useState(null);
  const [formSeller, setFormSeller] = useState(null);
 

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const {
    seller,
    setSeller,
    loading: sellerLoading,
  } = useSeller();
  const { checkedSeller } = useCheckSeller(
    'sellerApproved',
    '/antojos/sellers/approving'
  );

  useEffect(() => {
    if (!sellerLoading) {
      if (seller) {
        setFormSeller(seller);
      }
    }
  }, [seller, sellerLoading]);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await updateSeller(seller._id, formSeller);
      setSeller(formSeller);
    } catch (error) {
      setError('Error al actualizar el perfil del vendedor.');
      console.error(error);
    }
  };
  const handleImagesUpdate = updatedImages => {
    setSeller({ ...seller, logo: updatedImages[0] });
  };

  const handleFinish = async () => {
    if (!seller) {
      setError('Error: No se encontró el vendedor.');
      return;
    }
  
    try {
      setLoading(true);
      const sellerData = { statusExtraTime: false };
  
      const response = await fetch(`/api/sellers/${seller._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sellerData),
      });
  
      if (!response.ok) throw new Error('Error finalizando la disponibilidad');
      console.log("vendor",seller);
      setSeller({...seller, statusExtraTime: false});
      console.log("despues de ",seller);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };  
  
  
  if (!checkedSeller || !seller) return <Loading />;
  if (error) return <p>{error}</p>;

  return (
    <div className='flex flex-col h-dvh relative'>
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
              </div>

          <div>
          <div
            className={`flex justify-between items-center gap-4 p-2 rounded shadow-md ${
            seller.statusExtraTime ? 'bg-gray-200 opacity-50 pointer-events-none' : 'bg-white'}`}
          >
            <ExtraTimeBadge2 
            seller={seller} 
            setSeller={setSeller}
             />
          </div>
        </div>
        {seller.statusExtraTime && (
          <button className='btn btn-primary' onClick={handleFinish}>
            Finalizar
          </button>
        )}

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
