'use client';
import { logger } from '@/lib/logger';
import { toNationalPhone } from '@/lib/phone';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { localizedHref } from '@/i18n/routing';
import InputFields from '@/components/auth/register/InputFields';
import { FcHighPriority } from 'react-icons/fc';
import { IoClose } from 'react-icons/io5';
import ImageGrid from '@/components/general/ImageGrid';
import Loading from '@/components/general/Loading';
import { useCheckSeller } from '@/context/SellerContext';
import { useSeller } from '@/context/SellerContext';
import UniGraphicSelector from '@/components/university/UniGraphicSelector';

// T-81 (seller onboarding): moved from src/app/antojos/sellers/register/
// (deleted). Still a Client Component - it is a form with state - so it
// takes no `params`; src/app/[locale]/layout.jsx already calls
// setRequestLocale for the whole subtree. Gated by isProtectedRoute at both
// /antojos/sellers/register and its /en twin (src/lib/route-guards.ts).
const RegisterSeller = () => {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('SellerRegister');
  const [sellerData, setSellerData] = useState({
    businessName: '',
    instagramUser: '',
    description: '',
    university: '',
    logo: '',
    slogan: '',
    phoneNumber: '',
    images: [],
  });
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  var { seller, setSeller, dbUser, setDbUser } = useSeller();
  const { checkedSeller } = useCheckSeller('userNotSeller', '');
  if (!checkedSeller) return <Loading />;

  const handleChange = e => {
    const { name, value, type, checked } = e.target;

    let newValue = type === 'checkbox' ? checked : value;

    // When the field is "phone" it is normalised before being stored. Simply
    // truncating to the first 10 digits turned a pasted `+57 300 123 4567`
    // into `5730012345`, a 10-digit number the server can no longer tell
    // apart from a good one.
    if (name === 'phoneNumber') {
      newValue = toNationalPhone(value);
    }

    if (name) {
      setSellerData({
        ...sellerData,
        [name]: newValue,
      });
    }
  };

  const handleImagesUpdate = updatedImages => {
    setSellerData({ ...sellerData, images: updatedImages });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    sellerData.logo = sellerData?.images[0];
    sellerData.description = JSON.stringify(sellerData.description);
    // logger.debug(sellerData);

    try {
      const response = await fetch('/api/sellers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sellerData),
      });

      if (response.ok) {
        setSeller(sellerData);
        setDbUser({ ...dbUser, role: 'seller' });
        router.push(localizedHref('/antojos/sellers/approving', locale));
      } else {
        const errorData = await response.json();
        logger.error('Error:', errorData.message);
        setErrorCode(errorData.message);
      }
    } catch (error) {
      logger.error('Network Error:', error);
      setErrorCode('Network Error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className='h-[836px] relative'>
      <div className='h-1/4 sticky top-0 left-0'>
        <div
          id='register-bg'
          className='bg-[#393939] h-full flex flex-col justify-center items-center overflow-hidden'
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
      </div>
      <div className='h-3/4'>
        <div className='relative bg-[#393939]'>
          <div className='bg-base-100 text-base-content rounded-t-3xl h-max w-full px-6 pt-6 pb-16'>
            <form onSubmit={handleSubmit}>
              <div className='flex flex-col gap-7'>
                <InputFields
                  title={t('businessNameLabel')}
                  type='text'
                  placeholder={t('businessNamePlaceholder')}
                  value={sellerData.businessName}
                  onChange={handleChange}
                  name='businessName'
                  required
                />
                <InputFields
                  title={t('descriptionLabel')}
                  type='textarea'
                  placeholder={t('descriptionPlaceholder')}
                  value={sellerData.description}
                  onChange={handleChange}
                  name='description'
                  required
                />
                <InputFields
                  title={t('sloganLabel')}
                  type='text'
                  placeholder={t('sloganPlaceholder')}
                  value={sellerData.slogan}
                  onChange={handleChange}
                  name='slogan'
                />
                <div>
                  <label>{t('universityLabel')}</label>
                  <UniGraphicSelector 
                    value={sellerData.university}
                    onUniversityChange={(selected) => setSellerData({ ...sellerData, university: selected })}
                  />    
                </div>

                <InputFields
                  title={t('instagramLabel')}
                  type='text'
                  placeholder={t('instagramPlaceholder')}
                  value={sellerData.instagramUser}
                  onChange={handleChange}
                  name='instagramUser'
                />

                <InputFields
                  title={t('phoneLabel')}
                  type='tel'
                  placeholder={t('phonePlaceholder')}
                  value={sellerData.phoneNumber}
                  onChange={handleChange}
                  name='phoneNumber'
                  required
                />
                <ImageGrid
                  initialImages={sellerData.images}
                  onUpdateImages={handleImagesUpdate}
                  nameFolder='sellerlogos'
                  title={t('logoTitle')}
                  maxImages={1}
                />
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
    </div>
  );
};

export default RegisterSeller;
