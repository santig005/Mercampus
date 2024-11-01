'use client';
import { useState, useEffect } from 'react';

export default function EditProfile() {
  const [profile, setProfile] = useState({
    logo: '',
    businessName: '',
    phoneNumber: '',
    slogan: '',
    description: '',
    instagramUser: ''
  });

  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Cargar los datos del perfil cuando el componente se monte
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/sellers');
        if (!res.ok) {
          throw new Error('Error al cargar los datos del perfil');
        }
        const data = await res.json();
        setProfile(data.seller);
      } catch (err) {
        console.error(err);
        setError('No se pudieron cargar los datos del perfil.');
      }
    };

    fetchProfile();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: value
    });
  };

  const handleLogoChange = (e) => {
    setLogoFile(e.target.files[0]); // Asignar la imagen seleccionada
  };

  const uploadLogoToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'logos');

    // Utilizamos la API que ya tienes configurada
    const response = await fetch('/api/uploadimageProduct', {
      method: 'POST',
      body: formData, // Enviar el archivo al endpoint de subida
    });

    if (!response.ok) {
      throw new Error('Error al subir la imagen');
    }

    const data = await response.json();
    return data.url; // Obtener la URL de la imagen subida
  };

  const deleteOldLogoFromCloudinary = async (logoUrl) => {
    const publicId = logoUrl.split('/').pop().split('.')[0]; // Extraer el public_id de la URL del logo
  
    const res = await fetch(`/api/uploadimageProduct`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ publicId }),
    });
  
    if (!res.ok) {
      throw new Error('Error al eliminar el logo anterior de Cloudinary');
    }
  };  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError(null);

    try {
      let newLogoUrl = profile.logo;

      // Si se seleccionó un nuevo logo, subirlo a Cloudinary
      if (logoFile) {
        // Eliminar el logo anterior de Cloudinary si existe
        if (profile.logo) {
          await deleteOldLogoFromCloudinary(profile.logo);
        }
        newLogoUrl = await uploadLogoToCloudinary(logoFile); // Subir nuevo logo usando tu API
      }

      const updatedProfile = {
        ...profile,
        logo: newLogoUrl, // Actualizar con el nuevo logo (o el mismo si no se cambió)
      };

      const res = await fetch('/api/sellers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProfile),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        setError('Error al actualizar el perfil');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Hubo un problema con la actualización del perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Editar Perfil</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="logo">Logo</label>
          {profile.logo && <img src={profile.logo} alt="Logo actual" width={100} />}
        </div>
        <div>
          <label htmlFor="newLogo">Subir nuevo Logo:</label>
          <input
            type="file"
            id="newLogo"
            name="newLogo"
            onChange={handleLogoChange} // Capturar el archivo seleccionado
          />
        </div>
        <div>
          <label htmlFor="businessName">Nombre del negocio:</label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            value={profile.businessName}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label htmlFor="phoneNumber">Número de teléfono:</label>
          <input
            type="text"
            id="phoneNumber"
            name="phoneNumber"
            value={profile.phoneNumber}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label htmlFor="slogan">Slogan:</label>
          <input
            type="text"
            id="slogan"
            name="slogan"
            value={profile.slogan}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label htmlFor="description">Descripción:</label>
          <textarea
            id="description"
            name="description"
            value={profile.description}
            onChange={handleInputChange}
          ></textarea>
        </div>
        <div>
          <label htmlFor="instagramUser">Usuario de Instagram:</label>
          <input
            type="text"
            id="instagramUser"
            name="instagramUser"
            value={profile.instagramUser}
            onChange={handleInputChange}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>

      {success && <p style={{ color: 'green' }}>Perfil actualizado con éxito!</p>}
    </div>
  );
}