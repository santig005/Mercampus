'use client';
import React, { useEffect, useState } from 'react';
import { updateSeller} from '@/services/sellerService';
import InputFields from '@/components/auth/register/InputFields';
import { useRouter } from 'next/navigation';
import Loading from '@/components/general/Loading';
import ToggleSwitch from '@/components/availability/ToggleSwitch';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import ImageGrid from '@/components/general/ImageGrid';
import { useSeller } from '@/context/SellerContext';
import { useCheckSeller } from '@/context/SellerContext';
 
export default function EditSellerPage() {
  const [sellerAvailability, setSellerAvailability] = useState(false);
   const [seller, setSeller] = useState(null); 
 
  const [error, setError] = useState(null);
  const router = useRouter();
  const {seller:dataSeller, loading: sellerLoading } = useSeller();
  const {checkedSeller}=useCheckSeller("sellerApproved", "/antojos/sellers/approving");
  
   
     useEffect(() => {
       if (!sellerLoading) {
         if(dataSeller){
            setSeller(dataSeller);
            setSellerAvailability(dataSeller.availability);
         }
       }
     }, [dataSeller, sellerLoading]);
 
     
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateSeller(seller._id, seller);
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
        const updatedSeller = await updateSeller(seller._id, { availability: !sellerAvailability });
        //if the request is not successful, correct the availability
        if (!updatedSeller) {
          setSellerAvailability(!sellerAvailability);
        }
      }
      catch (error) {
        console.error('Error updating seller availability:', error);
      }
    };
    if(!checkedSeller || !seller) return <Loading/>;
  if (error) return <p>{error}</p>;
 
  return (
    <div className="max-w-3xl mx-auto p-8 bg-gray-100 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8">Edita tu Perfil</h1>
      <form onSubmit={handleSubmit} className="space-y-8">

      <div
          className="flex justify-between items-center gap-4 p-2 bg-white rounded shadow-md"
        >
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
          title="Nombre del Negocio"
          type="text"
          placeholder="Nombre del Negocio"
          value={seller.businessName || ''}
          onChange={(e) => setSeller({ ...seller, businessName: e.target.value })}
          name="businessName"
          required
        />
 
        <InputFields
          title="Eslogan"
          type="text"
          placeholder="Eslogan del negocio"
          value={seller.slogan || ''}
          onChange={(e) => setSeller({ ...seller, slogan: e.target.value })}
          name="slogan"
        />
 
        <InputFields
          title="Descripción"
          type="text"
          placeholder="Descripción del negocio"
          value={seller.description || ''}
          onChange={(e) => setSeller({ ...seller, description: e.target.value })}
          name="description"
        />
 
        <InputFields
          title="Usuario de Instagram"
          type="text"
          placeholder="@usuario_instagram"
          value={seller.instagramUser || ''}
          onChange={(e) => setSeller({ ...seller, instagramUser: e.target.value })}
          name="instagramUser"
        />
 
        <InputFields
          title="Número de Teléfono"
          type="number"
          placeholder="Número de contacto"
          value={seller.phoneNumber || ''}
          onChange={(e) => setSeller({ ...seller, phoneNumber: e.target.value })}
          name="phoneNumber"
          required
        />
        

        <ImageGrid
          initialImages={seller.logo ? [seller.logo] : []}
          onUpdateImages={handleImagesUpdate}
          nameFolder="sellerlogos"
          title="Logo de tu Negocio o foto de ti"
          maxImages={1}
        />
 
        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary"
          >
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
}