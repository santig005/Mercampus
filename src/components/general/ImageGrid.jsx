import React, { useState } from 'react';

export default function ImageGrid({
  initialImages,
  onUpdateImages,
  nameFolder,
  title,
  maxImages,
}) {
  const [images, setImages] = useState(initialImages || []);
  const [loading, setLoading] = useState(false);

  const handleAddImage = async event => {
    if (maxImages && images.length >= maxImages) {
      return;
    }
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', nameFolder);

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

      const updatedImages = [...images, newImageUrl];
      setImages(updatedImages);
      onUpdateImages(updatedImages); // Update parent component
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Hubo un problema al subir la imagen. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = async index => {
    const imageUrl = images[index];
    console.log('imageUrl', imageUrl);
    try {
      // 1️⃣ Obtener el fileId a partir de la URL
      const responseFileId = await fetch(
        `/api/fileId?url=${encodeURIComponent(imageUrl)}`
      );
      if (!responseFileId.ok) throw new Error('Error al obtener el fileId');
      const { fileId } = await responseFileId.json();
      console.log('fileId', fileId);
      // 2️⃣ Enviar petición para eliminar la imagen usando el fileId
      const responseDelete = await fetch('/api/images', {
        method: 'DELETE',
        body: JSON.stringify({ fileId }),
      });

      if (!responseDelete.ok) throw new Error('Error al eliminar la imagen');

      // 3️⃣ Actualizar el estado eliminando la imagen del arreglo
      const updatedImages = images.filter((_, i) => i !== index);
      setImages(updatedImages);
      onUpdateImages(updatedImages);
    } catch (error) {
      console.error('Error eliminando imagen:', error);
      alert('Hubo un problema al eliminar la imagen.');
    }
  };

  return (
    <div>
      <h3 className='text-lg font-semibold mb-4'>{title}</h3>
      <div
        className='grid gap-4 w-full'
        style={{
          gridTemplateColumns: 'repeat(auto-fit, 128px)',
        }}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className='relative w-32 h-32 border rounded-md overflow-hidden'
          >
            <img
              src={image}
              alt={`Imagen del producto ${index + 1}`}
              className='w-full h-full object-cover'
            />
            <button
              type='button'
              className='absolute top-1 right-1 bg-red-500 text-white w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-600 transition'
              onClick={() => handleRemoveImage(index)}
            >
              ✕
            </button>
          </div>
        ))}

        {/* Botón para agregar imagen */}
        {images.length < maxImages && (
          <div className='w-32 h-32 border-2 border-dashed border-gray-300 flex items-center justify-center rounded-md'>
            {loading ? (
              <p className='text-sm text-gray-500'>Subiendo...</p>
            ) : (
              <label className='cursor-pointer'>
                <span className='text-gray-500 text-sm font-medium'>
                  + Agregar
                </span>
                <input
                  type='file'
                  className='hidden'
                  accept='image/*'
                  onChange={handleAddImage}
                />
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
