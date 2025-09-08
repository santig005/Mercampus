'use client';
import React, { useEffect, useState } from 'react';
import {
  deleteProduct,
  getProductById,
  updateProduct,
} from '@/services/productService';
import InputFields from '@/components/auth/register/InputFields';
import { useRouter } from 'next/navigation';
import ToggleSwitch from '@/components/availability/ToggleSwitch';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import Loading from '@/components/general/Loading';
import { useCheckSeller } from '@/context/SellerContext';
import { useSeller } from '@/context/SellerContext';
import { getCategoriesBySection } from '@/utils/resources/categories';
import ImageGrid from '@/components/general/ImageGrid';
import Select from 'react-select';

export default function EditPsroductPage({ params }) {
  const { id } = params;
  const [product, setProduct] = useState({
    images: [],
    section: 'antojos',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const router = useRouter();
  const { seller, loading: sellerLoading } = useSeller();
  const { checkedSeller } = useCheckSeller(
    'sellerApproved',
    '/antojos/sellers/approving'
  );

  const categoryOptions = categories.map(category => ({
    value: category,
    label: category,
  }));

  useEffect(() => {
    async function fetchProduct() {
      if (seller) {
        try {
          const response = await getProductById(id);
          if (response.sellerId._id !== seller?._id) {
            router.push('/antojos');
          } else {
            setProduct(response);
          }
        } catch (error) {
          setError('Error al cargar los detalles del producto.');
          console.error(error);
        } finally {
          setLoading(false);
        }
      }
    }
    if (checkedSeller) {
      fetchProduct();
    }
  }, [id, router, seller, checkedSeller, sellerLoading]);

  // Cargar categorías basadas en la sección del producto
  useEffect(() => {
    const loadCategories = async () => {
      if (product.section) {
        const categoriesData = await getCategoriesBySection(product.section);
        setCategories(categoriesData);
      }
    };
    loadCategories();
  }, [product.section]);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await updateProduct(id, product);
      router.push('/antojos/sellers/products/edit');
    } catch (error) {
      setError('Error al actualizar el producto.');
      console.error(error);
    }
  };

  const handleCategoryChange = selectedOptions => {
    const selectedValues = selectedOptions
      ? selectedOptions.map(option => option.value)
      : [];
    setProduct(prev => ({ ...prev, category: selectedValues }));
  };

  const handleImagesUpdate = updatedImages => {
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

  if (!checkedSeller || !seller) return <Loading />;
  if (loading || !product) return <p>Cargando producto...</p>;
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
        <h2 className='text-2xl font-semibold text-white'>Edita tu prodcuto</h2>
        <p className='text-white'>
          Por favor completa la información del producto
        </p>
      </div>
      <div className='h-3/4 bg-[#393939]'>
        <div className='bg-white rounded-t-3xl h-max w-full absolute px-6 pt-6 pb-16'>
          <form onSubmit={handleSubmit}>
            <div className='flex flex-col gap-7'>
              <InputFields
                title='Nombre'
                type='text'
                placeholder='Nombre del producto'
                value={product.name}
                onChange={e => setProduct({ ...product, name: e.target.value })}
                name='name'
                required
              />

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Sección
                </label>
                <Select
                  name='section'
                  options={[
                    { value: 'antojos', label: 'Antojos (Productos alimenticios)' },
                    { value: 'marketplace', label: 'Marketplace (Productos no alimenticios)' }
                  ]}
                  value={{ 
                    value: product.section || 'antojos', 
                    label: (product.section || 'antojos') === 'antojos' 
                      ? 'Antojos (Productos alimenticios)' 
                      : 'Marketplace (Productos no alimenticios)' 
                  }}
                  onChange={(selectedOption) => {
                    setProduct({
                      ...product,
                      section: selectedOption.value,
                      category: [] // Limpiar categorías al cambiar sección
                    });
                  }}
                  className='basic-multi-select w-full'
                  classNamePrefix='Selecciona'
                  isSearchable={false}
                />
              </div>

              <InputFields
                title='Precio'
                type='text'
                placeholder='Precio'
                value={product.price}
                onChange={e =>
                  setProduct({ ...product, price: e.target.value })
                }
                name='price'
                required
              />

              <>
                <label className='block text-lg font-semibold mb-2'>
                  Disponibilidad
                </label>
                <div className='flex items-center justify-between'>
                  <AvailabilityBadge availability={product.availability} />
                  <div className='flex items-center justify-between mt-2'>
                    <ToggleSwitch
                      isOn={product.availability}
                      onToggle={() =>
                        setProduct({
                          ...product,
                          availability: !product.availability,
                        })
                      }
                    />
                  </div>
                </div>
              </>

              <>
                <label className='block text-lg font-semibold mb-2'>
                  Categoría
                </label>
                <Select
                  isMulti
                  name='category'
                  options={categoryOptions}
                  value={categoryOptions.filter(option =>
                    product.category?.includes(option.value)
                  )}
                  onChange={handleCategoryChange}
                  className='basic-multi-select w-full'
                  classNamePrefix='select'
                />
              </>

              <InputFields
                title='Descripcion'
                type='textarea'
                placeholder='Descripción'
                value={product.description}
                onChange={e =>
                  setProduct({ ...product, description: e.target.value })
                }
                name='description'
                required
              />
              <ImageGrid
                initialImages={product.images}
                onUpdateImages={handleImagesUpdate}
                nameFolder='products'
                title='Imágenes del Producto'
                maxImages={5}
              />
              <div className='flex justify-end'>
                <button
                  type='button'
                  className='btn btn-danger mr-4'
                  onClick={handleDeleteProduct}
                >
                  Eliminar Producto
                </button>
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
