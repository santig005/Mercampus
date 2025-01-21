import React, { useState } from 'react';

export default function ImageGrid({ initialImages, onUpdateImages }) {
  const [images, setImages] = useState(initialImages || []);
  const [loading, setLoading] = useState(false);

  const handleAddImage = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'products');

    try {
      const response = await fetch('/api/uploadimageProduct', {
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

  const handleRemoveImage = (index) => {
    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);
    onUpdateImages(updatedImages); // Update parent component
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Imágenes del Producto</h3>
      <div className="grid grid-cols-3 gap-4">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative w-full h-32 border rounded-md overflow-hidden"
          >
            <img
              src={image}
              alt={`Imagen del producto ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
              onClick={() => handleRemoveImage(index)}
            >
              ✕
            </button>
          </div>
        ))}

        {/* Botón para agregar imagen */}
        <div className="w-full h-32 border-2 border-dashed border-gray-300 flex items-center justify-center rounded-md">
          {loading ? (
            <p className="text-sm text-gray-500">Subiendo...</p>
          ) : (
            <label className="cursor-pointer">
              <span className="text-gray-500 text-sm font-medium">+ Agregar</span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAddImage}
              />
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
