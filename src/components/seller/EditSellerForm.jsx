'use client';
import { logger } from '@/lib/logger';
import React, { useEffect, useState } from 'react';
import { updateSeller } from '@/services/sellerService';
import InputFields from '@/components/auth/register/InputFields';
import { useRouter } from 'next/navigation';
import Loading from '@/components/general/Loading';
import ToggleSwitch from '@/components/availability/ToggleSwitch';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import ImageGrid from '@/components/general/ImageGrid';
import { useSeller } from '@/context/SellerContext';
import { useCheckSeller } from '@/context/SellerContext';
import UniGraphicSelector from '@/components/university/UniGraphicSelector';
import { useAuth } from '@clerk/nextjs';
import ProfileChecklist from '@/components/seller/ProfileChecklist';
 
// T-72: moved out of app/antojos/sellers/profile/edit/page.jsx, which is now a
// Server Component that resolves the checklist and renders this. The form
// itself stays a Client Component - it is all state, effects and handlers.
export default function EditSellerForm({ checklist }) {
  const [sellerAvailability, setSellerAvailability] = useState(false);
  // T-71. Sellers created before this field existed have no `paused` at all -
  // getSellerContextData reads them with .lean(), which skips Mongoose's
  // schema defaults - so this reads `undefined` for them, not `false`.
  const [sellerPaused, setSellerPaused] = useState(false);
  const [seller, setSeller] = useState(null);

  const [error, setError] = useState(null);
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
  const { getToken } = useAuth();

  useEffect(() => {
    if (!sellerLoading) {
      if (dataSeller) {
        setSeller(dataSeller);
        setSellerAvailability(dataSeller.availability);
        setSellerPaused(Boolean(dataSeller.paused));
      }
    }
  }, [dataSeller, sellerLoading]);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const token = await getToken({ skipCache: true});
      await updateSeller(seller._id, seller,token);
      setDataSeller(seller);
      router.push('/');
    } catch (error) {
      setError('Error al actualizar el perfil del vendedor.');
      logger.error(error);
    }
  };
  const handleImagesUpdate = updatedImages => {
    setSeller({ ...seller, logo: updatedImages[0] });
  };

  const handleSellerAvailability = async () => {
    try {
      const token = await getToken({ skipCache: true });
      setSellerAvailability(!sellerAvailability);
      setDataSeller({ ...seller, availability: !sellerAvailability });
      const updatedSeller = await updateSeller(seller._id, {
        availability: !sellerAvailability,
      },token);
      //if the request is not successful, correct the availability
      if (!updatedSeller) {
        setDataSeller({ ...seller, availability: !sellerAvailability });
        setSellerAvailability(!sellerAvailability);
      }
    } catch (error) {
      logger.error('Error updating seller availability:', error);
    }
  };
  // Optimistic like the availability toggle above, but it rolls back on the
  // catch: fetchAPIToken throws on a non-2xx instead of returning a falsy
  // value, so checking the return (as handleSellerAvailability does) never
  // catches a failed write. Keeps `seller` in sync too, or the next full-form
  // submit would send back the pre-toggle value.
  const handleSellerPaused = async () => {
    const next = !sellerPaused;
    const applyPaused = paused => {
      setSellerPaused(paused);
      setSeller(current => ({ ...current, paused }));
      setDataSeller({ ...seller, paused });
    };

    applyPaused(next);
    try {
      const token = await getToken({ skipCache: true });
      await updateSeller(seller._id, { paused: next }, token);
    } catch (error) {
      applyPaused(!next);
      logger.error('Error updating seller pause mode:', error);
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
        <div className='bg-base-100 text-base-content rounded-t-3xl h-max w-full absolute px-6 pt-6 pb-16'>
          <form onSubmit={handleSubmit}>
            <div className='flex flex-col gap-7'>
              <ProfileChecklist checklist={checklist} />

              <div className='flex justify-between items-center gap-4 p-2 bg-base-100 rounded shadow-md'>
                <div>
                  <h3>Mi disponibilidad</h3>
                  <AvailabilityBadge availability={sellerAvailability} />
                </div>
                <ToggleSwitch
                  isOn={sellerAvailability}
                  onToggle={() => handleSellerAvailability()}
                />
              </div>

              {/* T-71. Separate from the availability row above on purpose:
                  that one is today's schedule and the T-14 cron rewrites it
                  on every run, so it can't hold a multi-day absence. The
                  switch tracks visibility (green = listed) rather than the
                  pause itself, to keep the same colour meaning as the toggle
                  right above it. */}
              <div className='flex justify-between items-center gap-4 p-2 bg-base-100 rounded shadow-md'>
                <div className='pr-2'>
                  <h3>Visibilidad de mi tienda</h3>
                  <p
                    className={`text-sm font-semibold ${
                      sellerPaused ? 'text-[#CF0303]' : 'text-[#03CF30]'
                    }`}
                  >
                    {sellerPaused ? 'En pausa' : 'Visible'}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-base-content/70'>
                    Si la pausas dejas de aparecer en los listados mientras no
                    puedas vender. Conservas tu aprobación y tus productos:
                    cuando la reactives vuelves a aparecer como estabas.
                  </p>
                </div>
                <ToggleSwitch
                  isOn={!sellerPaused}
                  onToggle={() => handleSellerPaused()}
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
               <div>
                <label>Universidad</label>
                <UniGraphicSelector 
                  value={seller.university}
                  onUniversityChange={(selected) => setSeller({ ...seller, university: selected })}
                />    
              </div>

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
