import { describe, expect, it } from 'vitest';

import {
  PRODUCT_PARAM,
  SELLER_PARAM,
  searchWithModal,
  searchWithoutModal,
} from '@/lib/modal-url';

// T-167: the modal stack keeps the open modal in the URL. These keep every
// other parameter the listing depends on, and never leave two modals open.
describe('modal URL helpers (T-167)', () => {
  it('does not collide with the listing search text', () => {
    // ProductGrid reads `product` as the search box's text.
    expect(PRODUCT_PARAM).not.toBe('product');
  });

  it('opens a product, keeping the listing filters', () => {
    expect(searchWithModal('?category=Frutas&sort=newest', { type: 'product', id: 'p1' })).toBe(
      `?category=Frutas&sort=newest&${PRODUCT_PARAM}=p1`
    );
  });

  it('opening a seller replaces an open product, and vice versa', () => {
    const product = searchWithModal('', { type: 'product', id: 'p1' });
    const seller = searchWithModal(product, { type: 'seller', id: 's1' });

    expect(seller).toBe(`?${SELLER_PARAM}=s1`);
    expect(searchWithModal(seller, { type: 'product', id: 'p2' })).toBe(`?${PRODUCT_PARAM}=p2`);
  });

  it('closing removes only the modal parameter', () => {
    expect(searchWithoutModal(`?product=arepa&${PRODUCT_PARAM}=p1`)).toBe('?product=arepa');
  });

  it('closing with nothing else left gives an empty string, not a bare "?"', () => {
    expect(searchWithoutModal(`?${PRODUCT_PARAM}=p1`)).toBe('');
    expect(searchWithoutModal('')).toBe('');
  });
});
