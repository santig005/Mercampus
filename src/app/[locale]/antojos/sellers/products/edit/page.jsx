'use client';
import { logger } from '@/lib/logger';
import React, { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { localizedHref } from '@/i18n/routing';
import { getSellerProducts, updateProduct } from '@/services/productService';
import ProductCard from '@/components/products/ProductCard';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ToggleSwitch from '@/components/availability/ToggleSwitch';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import Loading from '@/components/general/Loading';
import { updateSeller } from '@/services/sellerService';
import { useSeller } from '@/context/SellerContext';
import { useCheckSeller } from '@/context/SellerContext';

// T-81 (seller products): moved from src/app/antojos/sellers/products/edit/
// (deleted). Still a Client Component - no `params`; src/app/[locale]/layout.jsx
// already calls setRequestLocale for the whole subtree. Gated by
// isProtectedRoute at both /antojos/sellers/products/edit and its /en twin
// (src/lib/route-guards.ts). Internal navigation to the add-product page and
// to a specific product's edit screen now goes through localizedHref, same
// pattern PR #363 fixed for SidebarBtn - both destinations are migrated too.
export default function EditProductsPage() {
  const [products, setProducts] = useState([]);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('EditProductsPage');

  const [sellerAvailability, setSellerAvailability] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { seller, setSeller, loading: sellerLoading } = useSeller();
  const { checkedSeller } = useCheckSeller(
    'sellerApproved',
    '/antojos/sellers/approving'
  );
  // Once the seller context is done loading, check if we have a valid seller
  useEffect(() => {
    if (!sellerLoading) {
      async function fetchSellerProducts() {
        try {
          const response = await getSellerProducts(seller._id);
          setProducts(response.products);
        } catch (error) {
          logger.error('Error fetching products:', error);
        } finally {
          setIsLoading(false);
        }
      }
      setSellerAvailability(seller.availability);

      fetchSellerProducts();
    }
  }, [seller, sellerLoading]);

  const handleAvailabilityToggle = async (id, currentAvailability) => {
    try {
      setProducts(prevProducts =>
        prevProducts.map(product =>
          product._id === id
            ? { ...product, availability: !product.availability }
            : product
        )
      );
      // T-112b: no getToken() (or logging it) before the write - updateProduct
      // is a relative browser fetch carrying Clerk's session cookie.
      const updatedProduct = await updateProduct(id, {
        availability: !currentAvailability
      });
      //if the request is not successful, correct the availability
      if (!updatedProduct) {
        setProducts(prevProducts =>
          prevProducts.map(product =>
            product._id === id
              ? { ...product, availability: currentAvailability }
              : product
          )
        );
      }
    } catch (error) {
      logger.error('Error updating availability:', error);
    }
  };
  const handleSellerAvailability = async () => {
    try {
      setSellerAvailability(!sellerAvailability);
      setSeller({ ...seller, availability: !sellerAvailability });
      const updatedSeller = await updateSeller(seller._id, {
        availability: !sellerAvailability
      });
      //if the request is not successful, correct the availability
      if (!updatedSeller) {
        setSellerAvailability(!sellerAvailability);
        setSeller({ ...seller, availability: !sellerAvailability });
      }
    } catch (error) {
      logger.error('Error updating seller availability:', error);
    }
  };

  if (!checkedSeller) return <Loading />;
  if (isLoading || sellerLoading) return <p>{t('loadingProducts')}</p>;

  return (
    <div className='p-4'>
      <div className='flex justify-between mb-4'>
        <h1 className='text-2xl font-bold mb-4'>{t('heading')}</h1>
        <button
          onClick={() => router.push(localizedHref('/antojos/product/add', locale))}
          className='btn btn-primary'
        >
          {t('addButton')}
        </button>
      </div>

      <h2>{t('instructions')}</h2>
      <div>
        <div className='flex justify-between items-center p-4 bg-base-100 text-base-content rounded-md shadow-md'>
          <div>
            <h3 className='text-lg font-semibold'>{t('myAvailability')}</h3>
            <AvailabilityBadge availability={sellerAvailability} />
          </div>
          <ToggleSwitch
            isOn={sellerAvailability}
            onToggle={handleSellerAvailability}
            label={t('availabilityToggleLabel', {
              name: seller?.businessName || t('yourBusinessFallback'),
              status: t(sellerAvailability ? 'available' : 'unavailable'),
            })}
          />
        </div>

        {/* Productos agrupados por sección */}
        {(() => {
          // Group the products by section
          const productsBySection = products?.reduce((acc, product) => {
            const section = product.section || 'antojos';
            if (!acc[section]) {
              acc[section] = [];
            }
            acc[section].push(product);
            return acc;
          }, {});

          // Order the sections so antojos comes first
          const sortedSections = Object.entries(productsBySection || {}).sort(([a], [b]) => {
            if (a === 'antojos') return -1;
            if (b === 'antojos') return 1;
            return a.localeCompare(b);
          });

          return sortedSections.map(([section, sectionProducts]) => (
            <div key={section} className='mt-6'>
              <h3 className='text-xl font-bold mb-4 text-gray-800 dark:text-base-content'>
                {section === 'antojos' ? (
                  <>🍕 {t('antojosSectionHeading', { count: sectionProducts.length })}</>
                ) : (
                  <>🛍️ {t('marketplaceSectionHeading', { count: sectionProducts.length })}</>
                )}
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {sectionProducts.map(product => (
                  <div
                    key={product._id}
                    className='bg-base-100 text-base-content drop-shadow-md p-2 rounded-md cursor-pointer flex flex-col gap-2'
                  >
                    <Link
                      href={localizedHref(`/antojos/sellers/products/edit/${product._id}`, locale)}
                      className='block'
                    >
                      <ProductCard product={product} variant='embedded' />
                    </Link>
                    <div className='flex justify-between'>
                      <p>{t('availabilityColumnLabel')}</p>
                      <ToggleSwitch
                        isOn={product.availability}
                        onToggle={() =>
                          handleAvailabilityToggle(product._id, product.availability)
                        }
                        label={t('availabilityToggleLabel', {
                          name: product.name,
                          status: t(product.availability ? 'available' : 'unavailable'),
                        })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
