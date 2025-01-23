'use client';
import { uploadImages } from '@/services/uploadImages';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Categories } from '@/utils/resources/categories';
import InputFields from '@/components/auth/register/InputFields';
import { FcHighPriority } from 'react-icons/fc';
import { IoClose } from 'react-icons/io5';

const AddProduct = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    images: [],
    thumbnail: '',
  });

  const [categories, setCategories] = useState([]); // State for storing categories
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [price, setPrice] = useState('');
  const [displayPrice, setDisplayPrice] = useState('');

  useEffect(() => {
    // Fetch categories when component mounts
    const loadCategories = async () => {
      const categoriesData = await Categories(); // Await the result
      setCategories(categoriesData); // Update state with fetched categories
    };

    loadCategories(); // Call the function on component mount
  }, []);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handlePriceChange = e => {
    const numericValue = e.target.value.replace(/[^0-9]/g, '');
    let formattedValue = '';

    if (numericValue !== '') {
      formattedValue = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        useGrouping: true,
      }).format(numericValue);
    }

    setDisplayPrice(formattedValue);
    setPrice(numericValue);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    // Image uploading

    // Usage
    let uploadedImages = [];
    try {
      uploadedImages = await uploadImages(formData.images);
    } catch (error) {
      alert('There was a problem uploading the images. Please try again.');
      setLoading(false);
      return;
    }

    // Prepare product data
    const data = {
      name: formData.name,
      category: formData.category,
      price: price,
      description: formData.description,
      images: uploadedImages, // Save uploaded image URLs
      thumbnail: uploadedImages[0], // This can also be one of the uploaded images
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

  return (
    <>
      <div className='flex flex-col h-dvh'>
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
          className={`h-1/4 bg-[#393939] flex flex-col justify-center items-center`}
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
        <div className='h-full relative bg-[#393939]'>
          <div className='bg-white rounded-t-3xl h-full w-full absolute px-6 pt-6 pb-16'>
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
                  <select
                    name='category'
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className='select select-bordered w-full'
                  >
                    <option value=''>Selecciona</option>
                    {categories.map((category, index) => (
                      <option key={index} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <InputFields
                  title='Precio'
                  type='text'
                  placeholder='Precio del producto'
                  value={displayPrice}
                  onChange={handlePriceChange}
                  name='price'
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
                  <label>Imágenes</label>
                  <input
                    type='file'
                    name='images'
                    multiple
                    onChange={e =>
                      setFormData({ ...formData, images: [...e.target.files] })
                    }
                    required
                    className='file-input file-input-bordered w-full'
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
