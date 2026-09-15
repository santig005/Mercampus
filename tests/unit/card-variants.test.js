import { describe, expect, it } from 'vitest';

import { productCardClassName, sellerCardClassName } from '@/lib/card-variant';

// The 'embedded' variant is only used by authenticated screens (product
// editing, seller admin) that the e2e cannot visit yet: there is no
// simulated Clerk session in Playwright. These tests are the only net
// covering that variant until there is one.

describe('productCardClassName', () => {
  it('standalone brings background, shadow and cursor-pointer', () => {
    const className = productCardClassName({ variant: 'standalone', isClicked: false });

    expect(className).toContain('bg-base-100');
    expect(className).toContain('drop-shadow-md');
    expect(className).toContain('cursor-pointer');
    expect(className).toContain('scale-100');
  });

  it('standalone with isClicked applies the reduced scale', () => {
    const className = productCardClassName({ variant: 'standalone', isClicked: true });

    expect(className).toContain('scale-[0.95]');
    expect(className).not.toContain('scale-100');
  });

  it('embedded brings no background, shadow or scale, regardless of isClicked', () => {
    const sinClick = productCardClassName({ variant: 'embedded', isClicked: false });
    const conClick = productCardClassName({ variant: 'embedded', isClicked: true });

    for (const className of [sinClick, conClick]) {
      expect(className).not.toContain('bg-base-100');
      expect(className).not.toContain('drop-shadow-md');
      expect(className).not.toContain('scale-');
    }
    // The base layout stays the same in both variants.
    expect(sinClick).toContain('flex gap-2');
  });
});

describe('sellerCardClassName', () => {
  it('standalone brings background, shadow and scale', () => {
    const className = sellerCardClassName({ variant: 'standalone', isClicked: false });

    expect(className).toContain('bg-base-100');
    expect(className).toContain('drop-shadow-md');
    expect(className).toContain('scale-100');
    expect(className).not.toContain('w-full');
  });

  it('embedded brings w-full and neither background, shadow nor scale', () => {
    const className = sellerCardClassName({ variant: 'embedded', isClicked: true });

    expect(className).toContain('w-full');
    expect(className).not.toContain('bg-base-100');
    expect(className).not.toContain('drop-shadow-md');
    expect(className).not.toContain('scale-');
  });

  it('cursor-pointer and the base layout are the same in both variants', () => {
    const standalone = sellerCardClassName({ variant: 'standalone', isClicked: false });
    const embedded = sellerCardClassName({ variant: 'embedded', isClicked: false });

    for (const className of [standalone, embedded]) {
      expect(className).toContain('flex gap-2 p-2 rounded-md cursor-pointer');
    }
  });
});
