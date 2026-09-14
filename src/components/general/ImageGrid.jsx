import { logger } from '@/lib/logger';
import React, { useRef, useState } from 'react';

export default function ImageGrid({
  initialImages,
  onUpdateImages,
  nameFolder,
  title,
  maxImages,
}) {
  const [images, setImages] = useState(initialImages || []);
  const [loading, setLoading] = useState(false);
  // T-116b: the fileId each upload in this session returned, keyed by URL, and
  // sent on delete - ImageKit's search lags an upload by several seconds, so a
  // photo removed right after picking it would otherwise answer 404 and stay
  // in ImageKit. Images that came in through initialImages have none and are
  // resolved by URL, as before. The parent still receives plain URLs.
  const uploadedFileIds = useRef(new Map());

  const handleAddImage = async (event) => {
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
      if (data.fileId) uploadedFileIds.current.set(newImageUrl, data.fileId);

      const updatedImages = [...images, newImageUrl];
      setImages(updatedImages);
      onUpdateImages(updatedImages); // Update parent component
    } catch (error) {
      logger.error('Error uploading image:', error);
      alert('Hubo un problema al subir la imagen. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = async (index) => {
    const imageUrl = images[index];
    logger.debug('imageUrl', imageUrl);
    try {
      // T-116: one call with the URL; the server resolves the file itself.
      const responseDelete = await fetch('/api/images', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: imageUrl,
          fileId: uploadedFileIds.current.get(imageUrl),
        }),
      });

      // 403 (not yours alone to delete, e.g. the shared default logo) and 404
      // (no such file) leave the file untouched, but the image still leaves
      // this form: with maxImages={1} a seller holding the default logo could
      // otherwise never replace it. 401 and 5xx mean nothing happened, so the
      // image stays and they can retry.
      if (
        !responseDelete.ok &&
        responseDelete.status !== 403 &&
        responseDelete.status !== 404
      ) {
        throw new Error(`Error al eliminar la imagen (${responseDelete.status})`);
      }

      uploadedFileIds.current.delete(imageUrl);
      // Update state, dropping the image from the array
      const updatedImages = images.filter((_, i) => i !== index);
      setImages(updatedImages);
      onUpdateImages(updatedImages);
    } catch (error) {
      logger.error('Error eliminando imagen:', error);
      alert('Hubo un problema al eliminar la imagen.');
    }
  };

  return (
    <div>
      <h3 className='text-lg font-semibold mb-4'>{title}</h3>
      <div className='grid grid-cols-3 gap-4'>
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
          <div className='w-32 h-32 border-2 border-dashed border-base-300 flex items-center justify-center rounded-md'>
            {loading ? (
              <p className='text-sm text-gray-500 dark:text-base-content/70'>Subiendo...</p>
            ) : (
              <label className='cursor-pointer'>
                <span className='text-gray-500 dark:text-base-content/70 text-sm font-medium'>
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
