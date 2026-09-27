'use client';

import { createContext, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import ProductModal from '@/components/products/ProductModal';
import SellerModal from '@/components/seller/index/SellerModal';
import { logger } from '@/lib/logger';
import { PRODUCT_PARAM, SELLER_PARAM, searchWithModal, searchWithoutModal } from '@/lib/modal-url';

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

const pushModal = target =>
  window.history.pushState(
    { [OWN_ENTRY]: true },
    '',
    currentUrlWith(searchWithModal(window.location.search, target))
  );

export function ModalStackProvider({ children }) {
  const products = useRef(new Map());
  // T-167b: a seller is cached with its schedules, the shape SellerModal
  // reads - from a product (its populated sellerId + schedules) or from
  // GET /api/sellers/[id] on a cold load.
  const sellers = useRef(new Map());

  const openProduct = useCallback(product => {
    products.current.set(product._id, product);
    pushModal({ type: 'product', id: product._id });
  }, []);

  const openSeller = useCallback(seller => {
    sellers.current.set(seller._id, seller);
    pushModal({ type: 'seller', id: seller._id });
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

  const value = useMemo(() => ({ openProduct, openSeller, close }), [openProduct, openSeller, close]);

  return (
    <ModalStackContext.Provider value={value}>
      {children}
      {/* useSearchParams needs a Suspense boundary; only the host waits on it,
          never the page. */}
      <Suspense fallback={null}>
        <ModalHost
          products={products}
          sellers={sellers}
          openSeller={openSeller}
          close={close}
        />
      </Suspense>
    </ModalStackContext.Provider>
  );
}

// On a cold load (a pasted or reloaded ?producto= / ?vendedor=) the item is
// not in memory yet: fetch it once, and remember a failure as null so the
// modal shows its error state instead of waiting forever.
function useCachedOrFetched(id, cache, fetchOne) {
  const [fetched, setFetched] = useState({});
  const cached = id ? cache.current.get(id) : undefined;
  const wasFetched = id ? id in fetched : false;

  useEffect(() => {
    if (!id || cached || wasFetched) return;
    let cancelled = false;
    fetchOne(id)
      .catch(error => {
        logger.error('ModalStack: loading a modal for a cold URL failed', error);
        return null;
      })
      .then(item => {
        if (!cancelled) setFetched(previous => ({ ...previous, [id]: item }));
      });
    return () => {
      cancelled = true;
    };
  }, [id, cached, wasFetched, fetchOne]);

  return {
    item: cached ?? (wasFetched ? fetched[id] : null),
    // Open once there is something to show - never while a cold load is
    // still in flight.
    ready: Boolean(id) && (Boolean(cached) || wasFetched),
  };
}

const fetchJson = url => fetch(url).then(response => (response.ok ? response.json() : null));
const fetchProduct = id => fetchJson(`/api/products/${encodeURIComponent(id)}`);
const fetchSeller = id =>
  fetchJson(`/api/sellers/${encodeURIComponent(id)}`).then(body => body?.seller ?? null);

function ModalHost({ products, sellers, openSeller, close }) {
  const searchParams = useSearchParams();
  const product = useCachedOrFetched(searchParams.get(PRODUCT_PARAM), products, fetchProduct);
  const seller = useCachedOrFetched(searchParams.get(SELLER_PARAM), sellers, fetchSeller);

  // modal-url.ts keeps at most one of the two parameters in the URL, so at
  // most one of these is open.
  return (
    <>
      <ProductModal
        theKey='stack'
        product={product.item}
        open={product.ready}
        onClose={close}
        onOpenSeller={openSeller}
      />
      <SellerModal seller={seller.item} open={seller.ready} onClose={close} />
    </>
  );
}
