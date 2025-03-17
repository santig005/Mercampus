'use client';
import { uploadImages } from '@/services/uploadImages';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Categories } from '@/utils/resources/categories';
import InputFields from '@/components/auth/register/InputFields';
import { FcHighPriority } from 'react-icons/fc';
import { IoClose } from 'react-icons/io5';
import { IoIosWarning } from 'react-icons/io';
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
  });

  const [categories, setCategories] = useState([]); // State for storing categories
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [inappropriateWarning, setInappropriateWarning] = useState(null);
  const [price, setPrice] = useState('');
  const [displayPrice, setDisplayPrice] = useState('');

  const categoryOptions = categories.map(category => ({
    value: category,
    label: category,
  }));

  // Once the seller context is done loading, check if we have a valid seller
  useEffect(() => {
    const loadCategories = async () => {
      const categoriesData = await Categories(); // Await the result
      setCategories(categoriesData); // Update state with fetched categories
    };
    loadCategories();
  }, []);

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
      // Reset warning if the user edits the text
    if (name === 'name' || name === 'description') {
      setInappropriateWarning(null);
  }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    setInappropriateWarning(null);

    // Content moderation check
    const moderationResponse = await fetch('/api/contentDetection/textDetection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: `${formData.name} ${formData.description}`,
      }),
    });
    const moderationData = await moderationResponse.json();

    if (moderationData.data.Sentiment === 'NEGATIVE') {
      setInappropriateWarning('Tu producto contiene contenido inapropiado. Modifícalo antes de continuar.');
      setLoading(false);
      return; // Stop form submission
    } 

    // Prepare product data
    const data = {
      name: formData.name,
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

        {inappropriateWarning && (
          <dialog id='warning-modal' className='modal modal-open'>
            <div className='modal-box bg-yellow-200 p-3 relative'>
              <button
                className='absolute top-2 right-2 text-yellow-600 text-2xl'
                onClick={() => setInappropriateWarning(null)}
              >
                <IoClose />
              </button>
              <div className='flex items-center gap-3 w-full'>
                <IoIosWarning className='text-yellow-600 text-4xl' />
                <div className='w-full'>
                  <h3 className='font-bold text-lg text-center'>Advertencia</h3>
                  <p className='py-2'>{inappropriateWarning}</p>
                </div>
              </div>
            </div>
          </dialog>
        )}

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
