'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { getTutorMe, updateTutorMe } from '@/services/tutorService';
import InputFields from '@/components/auth/register/InputFields';
import Loading from '@/components/general/Loading';
import ImageGrid from '@/components/general/ImageGrid';
import UniGraphicSelector from '@/components/university/UniGraphicSelector';
import Select from 'react-select';
import { subjects } from '@/utils/resources/subjects';

export default function EditTutorPage() {
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { getToken } = useAuth();

  const subjectOptions = subjects.map(subject => ({
    value: subject,
    label: subject,
  }));

  const fetchTutorData = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await getTutorMe(token);
      if (response.tutor) {
        setTutor(response.tutor);
      } else {
        setError('No se encontró el perfil del tutor.');
      }
    } catch (err) {
      setError('Error al cargar el perfil del tutor.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchTutorData();
  }, [fetchTutorData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        const token = await getToken();
        await updateTutorMe(tutor, token);
        router.push('/tutors');
    } catch (error) {
        setError('Error al actualizar el perfil del tutor.');
        console.error(error);
    }
  };

  const handleImagesUpdate = (updatedImages) => {
    setTutor({ ...tutor, photo: updatedImages[0] });
  };
  
  const handleSubjectChange = (selectedOptions) => {
    const selectedValues = selectedOptions ? selectedOptions.map(option => option.value) : [];
    setTutor({ ...tutor, subjects: selectedValues });
  };

  if (loading) return <Loading />;
  if (error) return <p className='text-center text-red-500'>{error}</p>;
  if (!tutor) return <p className='text-center'>Perfil de tutor no encontrado.</p>;

  return (
    <div className='flex flex-col h-dvh relative'>
      <div className='h-1/4 bg-[#393939] flex flex-col justify-center items-center sticky top-0 left-0'>
        <h2 className='text-2xl font-semibold text-white'>Edita tu Perfil de Tutor</h2>
        <p className='text-white'>Actualiza tu información personal y académica</p>
      </div>
      <div className='h-3/4 bg-[#393939]'>
        <div className='bg-white rounded-t-3xl h-max w-full absolute px-6 pt-6 pb-16'>
          <form onSubmit={handleSubmit}>
            <div className='flex flex-col gap-7'>
              <InputFields
                title='Tu Nombre'
                type='text'
                placeholder='Ej: Juan Pérez'
                value={tutor.tutorName || ''}
                onChange={(e) => setTutor({ ...tutor, tutorName: e.target.value })}
                name='tutorName'
                required
              />
              <InputFields
                title='Preséntate'
                type='textarea'
                placeholder='Ej: Soy Juan, estudio ingeniería...'
                value={tutor.description || ''}
                onChange={(e) => setTutor({ ...tutor, description: e.target.value })}
                name='description'
                required
              />
              <div>
                <label>Materias que enseñas</label>
                <Select
                  isMulti
                  name='subjects'
                  options={subjectOptions}
                  value={subjectOptions.filter(option => tutor.subjects?.includes(option.value))}
                  onChange={handleSubjectChange}
                  className='basic-multi-select w-full'
                  classNamePrefix='Selecciona'
                />
              </div>
              <div>
                <label>Universidad</label>
                <UniGraphicSelector 
                  value={tutor.university}
                  onUniversityChange={(selected) => setTutor({ ...tutor, university: selected })}
                />    
              </div>
              <InputFields
                title='Teléfono de Contacto'
                type='tel'
                placeholder='Número de teléfono'
                value={tutor.phoneNumber || ''}
                onChange={(e) => setTutor({ ...tutor, phoneNumber: e.target.value })}
                name='phoneNumber'
                required
              />
              <ImageGrid
                initialImages={tutor.photo ? [tutor.photo] : []}
                onUpdateImages={handleImagesUpdate}
                nameFolder='tutorimages'
                title='Sube una foto tuya'
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
