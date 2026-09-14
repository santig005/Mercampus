'use client';
import { logger } from '@/lib/logger';

import { getProducts } from '@/services/productService';
import ProductCard from '@/components/products/ProductCard';
import ProductModalHandler from '@/components/products/ProductModalHandler';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { useInView } from 'react-intersection-observer';
import { useRouter, useSearchParams } from 'next/navigation';
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

// T-123: either or both. Both selected is the default and is written as no
// `availability` param at all, so every link shared before this task still
// means "everything".
const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Disponibles ahora' },
  { value: 'unavailable', label: 'No disponibles' },
];

// Whether the sentinel is on screen once the list has stopped animating.
//
// useAutoAnimate animates the list container itself, not only the cards: when
// its children change, auto-animate's remain() runs a WAAPI animation on the
// container's `height`, from what it held before (the loading spinner) to the
// new page. For those ~250 ms the container is short, the cards overflow it,
// and the sentinel - its next sibling - sits just under where the spinner was,
// on screen. The observer reports that frame and "load more" fired with nobody
// scrolling. Measured with an instrumented e2e run: the sentinel inserted at
// y=1760 under 12 cards, reported intersecting at y=368 16 ms later, page 2
// requested at once. It happened on agent/develop in 1 of 3 runs; T-123's
// changes made it 3 of 3, which is how scroll-infinito.spec.js caught it.
//
// So the observer's word is confirmed after the list's animations finish (a
// real condition, not a timeout), with a fresh one-shot observation - the same
// check, clipping included, that useInView's own observer makes.
function isInViewOnceSettled(list, sentinel) {
  if (!list || !sentinel) return Promise.resolve(false);

  const running =
    typeof list.getAnimations === 'function' ? list.getAnimations({ subtree: true }) : [];

  return Promise.all(running.map(animation => animation.finished.catch(() => {}))).then(
    () =>
      new Promise(resolve => {
        if (!sentinel.isConnected) {
          resolve(false);
          return;
        }
        const observer = new IntersectionObserver(([entry]) => {
          observer.disconnect();
          resolve(entry.isIntersecting);
        });
        observer.observe(sentinel);
      })
  );
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { university } = useUniversity();
  const { ref: sentinelRef, inView } = useInView();

  // Both callback refs above hand the element to their library only; these
  // keep a handle for isInViewOnceSettled().
  const listRef = useRef(null);
  const sentinelElement = useRef(null);
  const setListRef = useCallback(
    node => {
      listRef.current = node;
      parent(node);
    },
    [parent]
  );
  const setSentinelRef = useCallback(
    node => {
      sentinelElement.current = node;
      sentinelRef(node);
    },
    [sentinelRef]
  );

  // Drops a fetch's response if the filters already changed by the time it
  // comes back: without this, a "load more" fired just before switching
  // filters could overwrite the new page's cursor with the old one's.
  const requestId = useRef(0);

  // Read the filters from the URL
  const product = searchParams.get('product') || '';
  const category = searchParams.get('category') || '';
  const sellerId = searchParams.get('sellerId') || sellerIdParam;
  // T-123: in the URL, like search (T-92), so a filtered view can be shared.
  // SearchBox knows this param and keeps it. Anything unrecognised is "both".
  const availabilityParam = searchParams.get('availability');
  const availability = AVAILABILITY_OPTIONS.some(o => o.value === availabilityParam)
    ? availabilityParam
    : 'all';

  const isAvailabilitySelected = value => availability === 'all' || availability === value;

  const toggleAvailability = value => {
    let next;
    if (availability === 'all') {
      // Deselecting one leaves the other.
      next = value === 'available' ? 'unavailable' : 'available';
    } else if (availability === value) {
      // The last selected option stays selected: "neither" would list nothing.
      return;
    } else {
      next = 'all';
    }

    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') {
      params.delete('availability');
    } else {
      params.set('availability', next);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  // Changing a filter restarts the listing from the first page.
  useEffect(() => {
    const thisRequest = ++requestId.current;
    setLoading(true);
    setProducts([]);
    setCursor(null);
    setHasMore(true);

    getProducts({
      product,
      category,
      sellerId,
      university,
      section,
      sort,
      availability,
      limit: PAGE_SIZE,
    })
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
  }, [product, category, sellerId, university, section, sort, availability]);

  // Infinite scroll: asks for the next page when the sentinel at the bottom
  // comes into view. It depends on hasMore/loading/loadingMore so it fires
  // again after each loaded page while the sentinel stays visible (short
  // listings that fit entirely in the window without any real scrolling).
  useEffect(() => {
    if (!inView || !hasMore || loading || loadingMore) return;

    // Only the wait is cancelled: once the request is out, requestId decides
    // what happens to its response, as before.
    let cancelled = false;
    const thisRequest = requestId.current;

    isInViewOnceSettled(listRef.current, sentinelElement.current).then(stillInView => {
      if (cancelled || !stillInView || thisRequest !== requestId.current) return;

      setLoadingMore(true);

      getProducts({
        product,
        category,
        sellerId,
        university,
        section,
        sort,
        availability,
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
    });

    return () => {
      cancelled = true;
    };
  }, [inView, hasMore, loading, loadingMore, cursor, product, category, sellerId, university, section, sort, availability]);

  return (
    <ProductModalHandler>
      {showModal => (
        <div className=''>
          <div className='flex flex-wrap items-center justify-between gap-2 px-2 pb-2'>
            <div
              className='flex gap-2'
              role='group'
              aria-label='Filtrar por disponibilidad'
            >
              {AVAILABILITY_OPTIONS.map(option => {
                const selected = isAvailabilitySelected(option.value);
                return (
                  <button
                    key={option.value}
                    type='button'
                    aria-pressed={selected}
                    className={`btn btn-sm rounded-full ${
                      selected ? 'category-active' : 'bg-base-100 text-base-content'
                    }`}
                    onClick={() => toggleAvailability(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
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
          <div className='flex flex-col gap-2' ref={setListRef}>
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
                <p>
                  {availability === 'available'
                    ? 'No hay productos disponibles en este momento'
                    : 'No se encontraron productos'}
                </p>
              </div>
            )}
          </div>
          {!loading && hasMore && (
            <div ref={setSentinelRef} className='flex justify-center py-4'>
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
