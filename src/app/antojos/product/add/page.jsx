'use client';
import { uploadImages } from '@/services/uploadImages';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCategoriesBySection } from '@/utils/resources/categories';
import InputFields from '@/components/auth/register/InputFields';
import { FcHighPriority } from 'react-icons/fc';
import { IoClose } from 'react-icons/io5';
import Loading from '@/components/general/Loading';
import { useCheckSeller } from '@/context/SellerContext';
import ImageGrid from '@/components/general/ImageGrid';
import Select from 'react-select';

const AddProduct = () => {
  const router = useRouter();
  const { checkedSeller } = useCheckSeller(
    'sellerApproved',
    '/antojos/sellers/approving'
  );
  const [formData, setFormData] = useState({
    name: '',
    category: [],
    price: '',
    description: '',
    images: [],
    section: 'antojos', // Por defecto antojos
  });

  const [categories, setCategories] = useState([]); // State for storing categories
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [price, setPrice] = useState('');
  const [displayPrice, setDisplayPrice] = useState('');

  const categoryOptions = categories.map(category => ({
    value: category,
    label: category,
  }));

  // Cargar categorías según la sección seleccionada
  useEffect(() => {
    const loadCategories = async () => {
      const categoriesData = await getCategoriesBySection(formData.section);
      setCategories(categoriesData);
    };
    loadCategories();
  }, [formData.section]);

  if (!checkedSeller) return <Loading />;

  const handleCategoryChange = selectedOptions => {
    const selectedValues = selectedOptions
      ? selectedOptions.map(option => option.value)
      : [];
    handleChange({ target: { name: 'category', value: selectedValues } });
  };

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    // Prepare product data
    const data = {
      name: formData.name,
      section: formData.section,
      category: formData.category,
      price: formData.price,
      description: formData.description,
      images: formData.images, // Save uploaded image URLs
    };

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Set content type to JSON
        },
        body: JSON.stringify(data), // Convert data object to JSON string
      });

      if (response.ok) {
        router.push('/'); // Redirect to seller profile
      } else {
        const errorData = await response.json();
        console.error('Error:', errorData.message);
        setErrorCode(errorData.message);
      }
    } catch (error) {
      console.error('Network Error:', error);
      setErrorCode('Network Error. Please try again.');
    }
    setLoading(false);
  };

  const handleImagesUpdate = updatedImages => {
    setFormData({ ...formData, images: updatedImages });
  };

  return (
    <>
      <div className='flex flex-col h-dvh relative'>
        {/* Errors modal */}
        <dialog
          id='errors'
          className={`modal ${errorCode ? 'modal-open' : ''}`}
        >
          <div className='modal-box bg-[#fde6e6] p-3'>
            <div className='flex justify-start items-center gap-3 w-full'>
              <div className=''>
                <FcHighPriority className='text-red-400 text-4xl' />
              </div>
              <div className='w-full'>
                <h3 className='font-bold text-lg flex justify-between'>
                  ¡Atención!
                  <form method='dialog'>
                    {/* if there is a button in form, it will close the modal */}
                    <button
                      className='font-normal'
                      onClick={() => setErrorCode('')}
                    >
                      <IoClose className='text-red-400 text-2xl' />
                    </button>
                  </form>
                </h3>
                <p className='py-2'>{errorCode}</p>
              </div>
            </div>
          </div>
        </dialog>

        {/* content */}
        <div
          id='register-bg'
          className={`h-1/4 bg-[#393939] flex flex-col justify-center items-center sticky top-0 left-0 overflow-hidden`}
        >
          {/* <Link href='/' className='btn btn-circle absolute top-4 left-4'>
            <TbChevronLeft className='icon' />
          </Link> */}
          <h2 className='text-2xl font-semibold text-white'>
            Agrega aquí tu producto
          </h2>
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
                  value={formData.name}
                  onChange={handleChange}
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
                    value={{ value: formData.section, label: formData.section === 'antojos' ? 'Antojos (Productos alimenticios)' : 'Marketplace (Productos no alimenticios)' }}
                    onChange={(selectedOption) => {
                      setFormData({
                        ...formData,
                        section: selectedOption.value,
                        category: [] // Limpiar categorías al cambiar sección
                      });
                    }}
                    className='basic-multi-select w-full'
                    classNamePrefix='Selecciona'
                    isSearchable={false}
                  />
                </div>
                
                <div>
                  <label>Categoría</label>
                  <Select
                    isMulti
                    name='category'
                    options={categoryOptions}
                    value={categoryOptions.filter(option =>
                      formData.category?.includes(option.value)
                    )}
                    onChange={handleCategoryChange}
                    className='basic-multi-select w-full'
                    classNamePrefix='Selecciona'
                  />
                </div>
                <InputFields
                  title='Precio'
                  type='text'
                  name='price'
                  placeholder='Precio del producto'
                  // value={formData.price}
                  onChange={handleChange}
                  required
                />
                <InputFields
                  title='Descripción'
                  type='textarea'
                  placeholder='Descripción del producto'
                  value={formData.description}
                  onChange={handleChange}
                  name='description'
                />
                <div>
                  <ImageGrid
                    initialImages={formData.images}
                    onUpdateImages={handleImagesUpdate}
                    nameFolder='products'
                    title='Imágenes del Producto'
                    maxImages={5}
                  />
                </div>
                <button
                  type='submit'
                  className='btn btn-primary w-full'
                  disabled={loading}
                >
                  {loading ? (
                    <span className='loading loading-infinity loading-lg'></span>
                  ) : (
                    'Subir Producto'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddProduct;
