// T-167: the query parameters that say which modal is open. The URL is the
// modal stack's single source of truth - opening pushes one of these, the
// browser's back button pops it - so these helpers are the only place that
// knows their names.
//
// `producto`, not `product`: ProductGrid already reads `product` as the
// search text (see SearchBox).
export const PRODUCT_PARAM = 'producto';
export const SELLER_PARAM = 'vendedor';

const MODAL_PARAMS = [PRODUCT_PARAM, SELLER_PARAM];

export type ModalTarget = { type: 'product' | 'seller'; id: string };

// The search string with `target` as the open modal. Every other parameter
// (search text, category, sort, availability filter) is kept, and any other
// modal parameter is dropped: exactly one modal is open at a time.
export function searchWithModal(search: string, target: ModalTarget): string {
  const params = new URLSearchParams(search);
  for (const key of MODAL_PARAMS) params.delete(key);
  params.set(target.type === 'product' ? PRODUCT_PARAM : SELLER_PARAM, target.id);
  return `?${params.toString()}`;
}

// The search string with no modal open; '' when nothing else is left, so
// closing a modal on /antojos lands on /antojos and not on /antojos?.
export function searchWithoutModal(search: string): string {
  const params = new URLSearchParams(search);
  for (const key of MODAL_PARAMS) params.delete(key);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
