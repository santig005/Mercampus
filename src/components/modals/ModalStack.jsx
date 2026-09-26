'use client';

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import ProductModal from '@/components/products/ProductModal';
import { logger } from '@/lib/logger';
import { PRODUCT_PARAM, searchWithModal, searchWithoutModal } from '@/lib/modal-url';

// T-167 (option C, decided by the human on 2026-09-26): one product modal for
// the whole layout, driven by the URL, instead of a ProductModalHandler - and
// its own <dialog> - inside every list that shows products.
//
// The browser history is the stack. Opening a product pushes `?producto=<id>`
// with history.pushState, which Next 14.2's app router integrates natively
// (useSearchParams sees it; no navigation, no server round trip), so the
// listing behind stays exactly as it was - scroll, loaded pages and all.
// The browser's back button pops the entry and the modal closes by itself.
//
// Data: a product opened from a list is already in memory with the listing's
// shape (populated seller, schedules - T-165), so it is cached here and the
// modal opens instantly. Only a cold load of `?producto=<id>` - a pasted
// address, a reload - asks GET /api/products/[id] for it.

// Marks history entries this stack pushed. Closing one of those is
// history.back(); closing a modal the page was *loaded* with (no entry of
// ours behind it) must not leave the site, so it replaces the URL instead.
const OWN_ENTRY = '__mercampusModal';

const ModalStackContext = createContext(null);

export function useModalStack() {
  const context = useContext(ModalStackContext);
  if (!context) {
    throw new Error('useModalStack must be used inside <ModalStackProvider>');
  }
  return context;
}

const currentUrlWith = search =>
  `${window.location.pathname}${search}${window.location.hash}`;

export function ModalStackProvider({ children }) {
  const products = useRef(new Map());

  const openProduct = useCallback(product => {
    products.current.set(product._id, product);
    window.history.pushState(
      { [OWN_ENTRY]: true },
      '',
      currentUrlWith(searchWithModal(window.location.search, { type: 'product', id: product._id }))
    );
  }, []);

  const close = useCallback(() => {
    if (window.history.state?.[OWN_ENTRY]) {
      window.history.back();
    } else {
      // `null`, not the current state: Next's patched replaceState skips
      // syncing its router when handed a state that already carries its own
      // internals (`__NA`), so useSearchParams would keep seeing ?producto=
      // and the modal would stay open. With null it copies them itself.
      window.history.replaceState(
        null,
        '',
        currentUrlWith(searchWithoutModal(window.location.search))
      );
    }
  }, []);

  const value = useMemo(() => ({ openProduct, close }), [openProduct, close]);

  return (
    <ModalStackContext.Provider value={value}>
      {children}
      {/* useSearchParams needs a Suspense boundary; only the host waits on it,
          never the page. */}
      <Suspense fallback={null}>
        <ModalHost products={products} close={close} />
      </Suspense>
    </ModalStackContext.Provider>
  );
}

function ModalHost({ products, close }) {
  const searchParams = useSearchParams();
  const productId = searchParams.get(PRODUCT_PARAM);
  // Products fetched on a cold load, by id: the product, or null if the
  // request failed (the modal then shows its own error state).
  const [fetched, setFetched] = useState({});

  const cached = productId ? products.current.get(productId) : undefined;
  const wasFetched = productId ? productId in fetched : false;

  useEffect(() => {
    if (!productId || cached || wasFetched) return;
    let cancelled = false;
    fetch(`/api/products/${encodeURIComponent(productId)}`)
      .then(response => (response.ok ? response.json() : null))
      .catch(error => {
        logger.error('ModalStack: loading a product for a cold ?producto= failed', error);
        return null;
      })
      .then(product => {
        if (!cancelled) setFetched(previous => ({ ...previous, [productId]: product }));
      });
    return () => {
      cancelled = true;
    };
  }, [productId, cached, wasFetched]);

  const product = cached ?? (wasFetched ? fetched[productId] : null);
  // Open once there is something to show: the product, or the error state of
  // a cold load that failed. Never while a cold load is still in flight.
  const open = Boolean(productId) && (Boolean(cached) || wasFetched);

  return <ProductModal theKey='stack' product={product} open={open} onClose={close} />;
}
