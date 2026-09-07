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

// T-70: opciones de orden que expone GET /api/products (ver SORT_CONFIGS).
// 'default' mantiene el orden historico (disponibles primero); el resto son
// las agregadas por esta tarea.
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
  // Estado local, no un query param: SearchBox reconstruye la URL desde cero
  // en cada tecla (ver SearchBox.jsx) y se llevaria puesto cualquier param
  // que no conozca, asi que un `sort` en la URL desaparecería al escribir.
  const [sort, setSort] = useState('default');
  const [parent] = useAutoAnimate();
  const searchParams = useSearchParams();
  const { university } = useUniversity();
  const { ref: sentinelRef, inView } = useInView();

  // Descarta la respuesta de un fetch si los filtros ya cambiaron para
  // cuando vuelve: sin esto, un "cargar mas" disparado justo antes de
  // cambiar de filtro podria pisar el cursor de la pagina nueva con el de
  // la vieja.
  const requestId = useRef(0);

  // Extraemos los filtros desde la URL
  const product = searchParams.get('product') || '';
  const category = searchParams.get('category') || '';
  const sellerId = searchParams.get('sellerId') || sellerIdParam;

  // Cambiar de filtro reinicia el listado desde la primera pagina.
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

  // Scroll infinito: pide la siguiente pagina cuando el centinela de abajo
  // entra en pantalla. Depende de hasMore/loading/loadingMore para volver a
  // dispararse tras cada pagina cargada mientras el centinela siga visible
  // (listados cortos que caben enteros en la ventana sin necesidad de
  // scroll real).
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
