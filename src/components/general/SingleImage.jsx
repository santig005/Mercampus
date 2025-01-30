import React, { useState } from 'react';

export default function SingleImageUploader({ initialImage, onUpdateImage }) {
  const [image, setImage] = useState(initialImage || '');
  const [loading, setLoading] = useState(false);

  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'sellerlogos');

    try {
      const response = await fetch('/api/images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error uploading image');
      }

      const data = await response.json();
      const newImageUrl = data.url;
      setImage(newImageUrl);
      onUpdateImage(newImageUrl); // Update parent component
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Hubo un problema al subir la imagen. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setImage('');
    onUpdateImage(''); // Notify parent of removal
  };

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-semibold mb-4">Imagen de Perfil</h3>
      <div className="w-40 h-40 border rounded-md overflow-hidden relative flex items-center justify-center">
        {image ? (
          <>
            <img
              src={image}
              alt="Producto"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
              onClick={handleRemoveImage}
            >
              ✕
            </button>
          </>
        ) : (
          <label className="cursor-pointer flex flex-col items-center">
            {loading ? (
              <p className="text-sm text-gray-500">Subiendo...</p>
            ) : (
              <span className="text-gray-500 text-sm font-medium">+ Agregar</span>
            )}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
          </label>
        )}
      </div>
    </div>
  );
}
