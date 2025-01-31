'use client';
import React, { useEffect, useState } from 'react';
import { getSellerByEmail, updateSeller} from '@/services/sellerService';
import InputFields from '@/components/auth/register/InputFields';
import { useRouter } from 'next/navigation';
import ToggleSwitch from '@/components/availability/ToggleSwitch';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import { useUser } from '@clerk/nextjs';
import SingleImage from '@/components/general/SingleImage';
 
export default function EditSellerPage() {
  const {user}= useUser();
  const [sellerId,setSellerId]=useState(null);
  const [sellerAvailability, setSellerAvailability] = useState(false);
  const [seller, setSeller] = useState({
    businessName: '',
    slogan: '',
    description: '',
    logo: '',
    instagramUser: '',
    availability: '',
    phoneNumber: '',
    userId: ''
  });
 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
 
  useEffect(() => {
    if(!user){
      window.location.href='/';
      return;
    }
    const fetchSeller=async() =>{
      try {
        const email=user.primaryEmailAddress.emailAddress;
        const response = await getSellerByEmail(email);
        setSellerId(response._id);
        setSellerAvailability(response.availability);
        if (response) {
          setSeller(response);
        } else {
          setError('No se encontró el vendedor.');
        }
      } catch (error) {
        setError('Error al cargar los datos del vendedor.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
 
    fetchSeller();
  }, [user]);
  useEffect(() => {
 
    const fetchSeller = async () => {
    };
 
    fetchSeller();
  }, [seller]);
 
 
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

  const handleSellerAvailability = async () => {
      try {
        setSellerAvailability(!sellerAvailability);
        const updatedSeller = await updateSeller(sellerId, { availability: !sellerAvailability });
        //if the request is not successful, correct the availability
        if (!updatedSeller) {
          setSellerAvailability(!sellerAvailability);
        }
      }
      catch (error) {
        console.error('Error updating seller availability:', error);
      }
    };
 
  if (loading) return <p>Cargando perfil...</p>;
  if (error) return <p>{error}</p>;
 
  return (
    <div className="max-w-3xl mx-auto p-8 bg-gray-100 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8">Editar Perfil</h1>
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

        <SingleImage
          initialImage={seller.logo}
          onUpdateImage={(newImage) => setSeller({ ...seller, logo: newImage })}
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