'use client';
import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { localizedHref } from '@/i18n/routing';
import { getCategoriesBySection } from '@/utils/resources/categories';
import InputFields from '@/components/auth/register/InputFields';
import { FcHighPriority } from 'react-icons/fc';
import { IoClose } from 'react-icons/io5';
import Loading from '@/components/general/Loading';
import { useCheckSeller } from '@/context/SellerContext';
import ImageGrid from '@/components/general/ImageGrid';
import Select from 'react-select';
import { useReactSelectStyles } from '@/utils/hooks/useReactSelectTheme';
import { APP_HOME } from '@/lib/app-home';

// T-81 (seller products): moved from src/app/antojos/product/add/ (deleted).
// Still a Client Component - it is a form with state - so it takes no
// `params`; src/app/[locale]/layout.jsx already calls setRequestLocale for
// the whole subtree. Gated by isProtectedRoute at both /antojos/product/add
// and its /en twin (src/lib/route-guards.ts).
//
// The section labels ("Antojos"/"Marketplace") are translated here - they are
// this form's own interface copy, not what a seller writes. The category
// options underneath (getCategoriesBySection: "Dulces", "Snacks", ...) are
// left as they are, same call the already-migrated listing zone's
// CategoryGrid makes without translating them - app-wide taxonomy, not this
// task's job to relitigate (see ROADMAP.md T-81).
const AddProduct = () => {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('AddProductPage');
  const { checkedSeller } = useCheckSeller(
    'sellerApproved',
    '/antojos/sellers/approving'
  );
  const selectStyles = useReactSelectStyles();
  const [formData, setFormData] = useState({
    name: '',
    category: [],
    price: '',
    description: '',
    images: [],
    section: 'antojos', // antojos by default
  });

  const [categories, setCategories] = useState([]); // State for storing categories
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  // T-119: the API's 400s carry a `fields` array naming exactly what was
  // wrong (see invalidPayload in src/lib/api-response.ts) - this page used to
  // read only `.message` and show the generic "Datos inválidos", which is
  // why a price-format bug looked like an opaque error for ten days (T-115).
  const [fieldErrors, setFieldErrors] = useState([]);

  const closeErrorModal = () => {
    setErrorCode('');
    setFieldErrors([]);
  };

  const categoryOptions = categories.map(category => ({
    value: category,
    label: category,
  }));

  // Load the categories for the selected section
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
        router.push(localizedHref(APP_HOME, locale));
      } else {
        const errorData = await response.json();
        logger.error('Error:', errorData.message);
        setErrorCode(errorData.message);
        setFieldErrors(Array.isArray(errorData.fields) ? errorData.fields : []);
      }
    } catch (error) {
      logger.error('Network Error:', error);
      setErrorCode(t('networkError'));
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
          <div className='modal-box p-3'>
            {/* T-127: this used to be `bg-[#fde6e6]`, a light pink with no
                dark-theme variant - heading/list text had no explicit color
                so it fell back to base-content, nearly invisible on that
                pink in the dark theme (see docs/audits/t-119/
                error-state__dark.png and t-127 in ROADMAP.md). `alert
                alert-error` is the same themed daisyUI token
                EditProductForm.jsx already uses for its error banner - its
                background and text both come from the current theme's
                error/error-content CSS vars, so they track light/dark
                instead of being hardcoded for one of them. */}
            <div
              role='alert'
              className='alert alert-error flex justify-start items-start gap-3 w-full'
            >
              <div className=''>
                <FcHighPriority className='text-4xl' />
              </div>
              <div className='w-full'>
                <h3 className='font-bold text-lg flex justify-between'>
                  {t('modalAttention')}
                  <form method='dialog'>
                    {/* if there is a button in form, it will close the modal */}
                    <button className='font-normal' onClick={closeErrorModal}>
                      <IoClose className='text-2xl' />
                    </button>
                  </form>
                </h3>
                <p className='py-2'>{errorCode}</p>
                {fieldErrors.length > 0 && (
                  <ul className='list-disc list-inside text-sm -mt-1 pb-1'>
                    {fieldErrors.map(({ field, message }) => (
                      <li key={field}>
                        <span className='font-semibold'>{field}:</span> {message}
                      </li>
                    ))}
                  </ul>
                )}
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
            {t('heading')}
          </h2>
          <p className='text-white'>
            {t('subtitle')}
          </p>
        </div>
        <div className='h-3/4 bg-[#393939]'>
          <div className='bg-base-100 text-base-content rounded-t-3xl h-max w-full absolute px-6 pt-6 pb-16'>
            <form onSubmit={handleSubmit}>
              <div className='flex flex-col gap-7'>
                <InputFields
                  title={t('nameLabel')}
                  type='text'
                  placeholder={t('namePlaceholder')}
                  value={formData.name}
                  onChange={handleChange}
                  name='name'
                  required
                />

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-base-content mb-2'>
                    {t('sectionLabel')}
                  </label>
                  <Select
                    name='section'
                    options={[
                      { value: 'antojos', label: t('sectionAntojos') },
                      { value: 'marketplace', label: t('sectionMarketplace') }
                    ]}
                    value={{
                      value: formData.section,
                      label: formData.section === 'antojos' ? t('sectionAntojos') : t('sectionMarketplace')
                    }}
                    onChange={(selectedOption) => {
                      setFormData({
                        ...formData,
                        section: selectedOption.value,
                        category: [] // Clear the categories when the section changes
                      });
                    }}
                    className='basic-multi-select w-full'
                    classNamePrefix='Selecciona'
                    isSearchable={false}
                    styles={selectStyles}
                  />
                </div>

                <div>
                  <label>{t('categoryLabel')}</label>
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
                    styles={selectStyles}
                  />
                </div>
                <InputFields
                  title={t('priceLabel')}
                  type='text'
                  name='price'
                  placeholder={t('pricePlaceholder')}
                  value={formData.price}
                  onChange={handleChange}
                  required
                />
                <InputFields
                  title={t('descriptionLabel')}
                  type='textarea'
                  placeholder={t('descriptionPlaceholder')}
                  value={formData.description}
                  onChange={handleChange}
                  name='description'
                />
                <div>
                  <ImageGrid
                    initialImages={formData.images}
                    onUpdateImages={handleImagesUpdate}
                    nameFolder='products'
                    title={t('imagesTitle')}
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
                    t('submit')
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
