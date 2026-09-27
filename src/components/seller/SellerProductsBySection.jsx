'use client';
import { logger } from '@/lib/logger';
import React, { useEffect, useState } from 'react';
import { getSellerProducts } from '@/services/productService';
import ProductCard from '@/components/products/ProductCard';
import { useModalStack } from '@/components/modals/ModalStack';
import { useTranslations } from 'next-intl';

export default function SellerProductsBySection({ sellerId }) {
  const t = useTranslations('SellerProductsBySection');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  // T-167b: the layout's modal stack. This used to wrap the list in its own
  // ProductModalHandler - a whole ProductModal, with its own nested
  // SellerModal, inside every seller modal - and refetch at every level.
  const { openProduct } = useModalStack();

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        // Every product of this seller (no section filter)
        const response = await getSellerProducts(sellerId);
        setProducts(response.products || []);
      } catch (error) {
        logger.error('Error fetching seller products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    if (sellerId) {
      fetchProducts();
    }
  }, [sellerId]);

  if (loading) {
    return (
      <div className='flex justify-center items-center py-8'>
        <span className='loading loading-spinner loading-md'></span>
      </div>
    );
  }

  if (!products || products.length === 0) {
    // T-73: dark:text-base-content/70 - this block sits inside SellerModal's
    // or SellerPage's bg-primary/dark:bg-base-100.
    return (
      <div className='text-center py-8 text-gray-500 dark:text-base-content/70'>
        <p>{t('empty')}</p>
      </div>
    );
  }

  // Group the products by section
  const productsBySection = products.reduce((acc, product) => {
    const section = product.section || 'antojos';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(product);
    return acc;
  }, {});

  // Order the sections so antojos comes first
  const sortedSections = Object.entries(productsBySection).sort(([a], [b]) => {
    if (a === 'antojos') return -1;
    if (b === 'antojos') return 1;
    return a.localeCompare(b);
  });

  return (
    <div className='space-y-6'>
      {sortedSections.map(([section, sectionProducts]) => (
        <div key={section}>
          <h3 className='text-lg font-bold mb-3 text-gray-800 dark:text-base-content px-6'>
            {t(section === 'antojos' ? 'antojosHeading' : 'marketplaceHeading', {
              count: sectionProducts.length,
            })}
          </h3>
          <div className='space-y-3 px-2'>
            {sectionProducts.map(product => (
              <div
                key={product._id}
                className='w-full'
                onClick={() => openProduct(product)}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
