'use client';
import React, { useEffect, useState } from 'react';
import { deleteProduct,getProductById, updateProduct } from '@/services/productService';
import InputFields from '@/components/auth/register/InputFields';
import { useRouter } from 'next/navigation';
import ToggleSwitch from '@/components/availability/ToggleSwitch';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import { categories } from '@/utils/resources/categories';
import ImageGrid from '@/components/general/ImageGrid';

export default function EditPsroductPage({params}) {
  const {id} = params;
  const [product, setProduct] = useState({
    images:[],
  }
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await getProductById(id);
        setProduct(response);
      } catch (error) {
        setError('Error al cargar los detalles del producto.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProduct(id, product);
      router.push('/antojos/sellers/products/edit');
    } catch (error) {
      setError('Error al actualizar el producto.');
      console.error(error);
    }
  };
  const handleImagesUpdate = (updatedImages) => {
    setProduct({ ...product, images: updatedImages });
  };
  const handleDeleteProduct = async () => {
    try {
      await deleteProduct(id);
      router.push('/antojos/sellers/products/edit');
    } catch (error) {
      setError('Error al eliminar el producto.');
      console.error(error);
    }
    };


  if (loading) return <p>Cargando producto...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div className="max-w-3xl mx-auto p-8 bg-gray-100 rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-8">Editar Producto</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
        <InputFields
                  title='Nombre'
                  type='text'
                  placeholder='Nombre del producto'
                  value={product.name}
                  onChange={(e) => setProduct({ ...product, name: e.target.value })}
                  name='name'
                  required
                />
        </div>

        <div>
        <InputFields
                  title='Precio'
                  type='number'
                  placeholder='Precio'
                  value={product.price}
                  onChange={(e) =>
                    setProduct({ ...product, price: parseFloat(e.target.value) })
                  }
                  name='price'
                  required
                />
        </div>

        <div>
            <label className="block text-lg font-semibold mb-2">
              Disponibilidad
            </label>
            <div className="flex items-center justify-between">
            <AvailabilityBadge availability={product.availability} />
              <div className="flex items-center justify-between mt-2">
            <ToggleSwitch
              isOn={product.availability}
              onToggle={() =>
                setProduct({ ...product, availability: !product.availability })
              }
            />
            </div>
            
          </div>

        </div>

        <div>
          <label className="block text-lg font-semibold mb-2">Categoría</label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={product.category}
            onChange={(e) => setProduct({ ...product, category: e.target.value })}
            required
          >
            <option value="" disabled>
              Selecciona una categoría
            </option>
            {categories.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>


        <div>
        <InputFields
                  title='Descripcion'
                  type='text'
                  placeholder='Descripción'
                  value={product.description}
                  onChange={(e) =>
                    setProduct({ ...product, description: e.target.value })
                  }
                  name='description'
                  required
                />
        </div>
        <div>
      <ImageGrid
        initialImages={product.images}
        onUpdateImages={handleImagesUpdate}
        nameFolder='products'
        title='Imágenes del Producto'
        maxImages={5}
      />
    </div>
        <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-danger mr-4"
          onClick={handleDeleteProduct}
          >
          Eliminar Producto
          </button>
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
