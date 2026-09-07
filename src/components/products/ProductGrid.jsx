'use client';
import { logger } from '@/lib/logger';

import { getProducts } from '@/services/productService';
import ProductCard from '@/components/products/ProductCard';
import ProductModalHandler from '@/components/products/ProductModalHandler';
import React, { useEffect, useRef, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useInView } from 'react-intersection-observer';
import { useSearchParams } from 'next/navigation';
import { useUniversity } from '@/context/UniversityContext';

const PAGE_SIZE = 12;

// T-70: the sort options GET /api/products exposes (see SORT_CONFIGS).
// 'default' keeps the historical order (available first); the rest were added
// by that task.
const SORT_OPTIONS = [
  { value: 'default', label: 'Recomendado' },
  { value: 'newest', label: 'Más nuevo' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
];

export default function ProductGrid({ sellerIdParam = '', section = 'antojos' }) {
  const [products, setProducts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // Local state, not a query param: SearchBox rebuilds the URL from scratch
  // on every keystroke (see SearchBox.jsx) and would wipe out any param it
  // doesn't know about, so a `sort` in the URL would vanish as you type.
  const [sort, setSort] = useState('default');
  const [parent] = useAutoAnimate();
  const searchParams = useSearchParams();
  const { university } = useUniversity();
  const { ref: sentinelRef, inView } = useInView();

  // Drops a fetch's response if the filters already changed by the time it
  // comes back: without this, a "load more" fired just before switching
  // filters could overwrite the new page's cursor with the old one's.
  const requestId = useRef(0);

  // Read the filters from the URL
  const product = searchParams.get('product') || '';
  const category = searchParams.get('category') || '';
  const sellerId = searchParams.get('sellerId') || sellerIdParam;

  // Changing a filter restarts the listing from the first page.
  useEffect(() => {
    const thisRequest = ++requestId.current;
    setLoading(true);
    setProducts([]);
    setCursor(null);
    setHasMore(true);

    getProducts({ product, category, sellerId, university, section, sort, limit: PAGE_SIZE })
      .then(({ products, nextCursor }) => {
        if (thisRequest !== requestId.current) return;
        setProducts(products);
        setCursor(nextCursor);
        setHasMore(Boolean(nextCursor));
      })
      .catch(error => {
        if (thisRequest !== requestId.current) return;
        logger.error('Error loading products:', error);
        setProducts([]);
        setHasMore(false);
      })
      .finally(() => {
        if (thisRequest === requestId.current) setLoading(false);
      });
  }, [product, category, sellerId, university, section, sort]);

  // Infinite scroll: asks for the next page when the sentinel at the bottom
  // comes into view. It depends on hasMore/loading/loadingMore so it fires
  // again after each loaded page while the sentinel stays visible (short
  // listings that fit entirely in the window without any real scrolling).
  useEffect(() => {
    if (!inView || !hasMore || loading || loadingMore) return;

    const thisRequest = requestId.current;
    setLoadingMore(true);

    getProducts({
      product,
      category,
      sellerId,
      university,
      section,
      sort,
      limit: PAGE_SIZE,
      cursor,
    })
      .then(({ products: nextProducts, nextCursor }) => {
        if (thisRequest !== requestId.current) return;
        setProducts(current => [...current, ...nextProducts]);
        setCursor(nextCursor);
        setHasMore(Boolean(nextCursor));
      })
      .catch(error => {
        if (thisRequest !== requestId.current) return;
        logger.error('Error loading more products:', error);
        setHasMore(false);
      })
      .finally(() => {
        if (thisRequest === requestId.current) setLoadingMore(false);
      });
  }, [inView, hasMore, loading, loadingMore, cursor, product, category, sellerId, university, section, sort]);

  return (
    <ProductModalHandler>
      {showModal => (
        <div className=''>
          <div className='flex justify-end px-2 pb-2'>
            <select
              className='select select-bordered select-sm'
              aria-label='Ordenar productos'
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className='flex flex-col gap-2' ref={parent}>
            {loading ? (
              <div className='flex justify-center'>
                <span className='loading loading-infinity loading-lg bg-primary-orange'></span>
              </div>
            ) : products?.length > 0 ? (
              products?.map(product => (
                <div
                  className=''
                  key={product._id}
                  onClick={() => {
                    if (sellerId) {
                      // document.getElementById('product_modal_main').close();
                      document
                        .getElementById('product_modal_secondary')
                        .close();
                      showModal(product, 'secondary');
                      // document.getElementById('seller_modal').close();
                    } else {
                      showModal(product, 'main');
                    }
                    //router.push(`/antojos/${product._id}`);
                  }}
                >
                  <ProductCard product={product} />
                </div>
              ))
            ) : (
              <div className='w-full flex justify-center my-4'>
                <p>No se encontraron productos</p>
              </div>
            )}
          </div>
          {!loading && hasMore && (
            <div ref={sentinelRef} className='flex justify-center py-4'>
              {loadingMore && (
                <span className='loading loading-spinner loading-md'></span>
              )}
            </div>
          )}
        </div>
      )}
    </ProductModalHandler>
  );
}
