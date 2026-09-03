import { describe, expect, it } from 'vitest';

import { productCardClassName, sellerCardClassName } from '@/lib/card-variant';

// La variante 'embedded' solo la usan pantallas autenticadas (edición de
// productos, admin de vendedores) que el e2e todavía no puede visitar: no hay
// sesión de Clerk simulada en Playwright. Estos tests son la única red que
// cubre esa variante hasta que exista.

describe('productCardClassName', () => {
  it('standalone trae fondo, sombra y cursor-pointer', () => {
    const className = productCardClassName({ variant: 'standalone', isClicked: false });

    expect(className).toContain('bg-white');
    expect(className).toContain('drop-shadow-md');
    expect(className).toContain('cursor-pointer');
    expect(className).toContain('scale-100');
  });

  it('standalone con isClicked aplica la escala reducida', () => {
    const className = productCardClassName({ variant: 'standalone', isClicked: true });

    expect(className).toContain('scale-[0.95]');
    expect(className).not.toContain('scale-100');
  });

  it('embedded no trae fondo, sombra ni escala, pase lo que pase con isClicked', () => {
    const sinClick = productCardClassName({ variant: 'embedded', isClicked: false });
    const conClick = productCardClassName({ variant: 'embedded', isClicked: true });

    for (const className of [sinClick, conClick]) {
      expect(className).not.toContain('bg-white');
      expect(className).not.toContain('drop-shadow-md');
      expect(className).not.toContain('scale-');
    }
    // El layout base sigue igual en las dos variantes.
    expect(sinClick).toContain('flex gap-2');
  });
});

describe('sellerCardClassName', () => {
  it('standalone trae fondo, sombra y escala', () => {
    const className = sellerCardClassName({ variant: 'standalone', isClicked: false });

    expect(className).toContain('bg-white');
    expect(className).toContain('drop-shadow-md');
    expect(className).toContain('scale-100');
    expect(className).not.toContain('w-full');
  });

  it('embedded trae w-full y ni fondo ni sombra ni escala', () => {
    const className = sellerCardClassName({ variant: 'embedded', isClicked: true });

    expect(className).toContain('w-full');
    expect(className).not.toContain('bg-white');
    expect(className).not.toContain('drop-shadow-md');
    expect(className).not.toContain('scale-');
  });

  it('cursor-pointer y el layout base son iguales en las dos variantes', () => {
    const standalone = sellerCardClassName({ variant: 'standalone', isClicked: false });
    const embedded = sellerCardClassName({ variant: 'embedded', isClicked: false });

    for (const className of [standalone, embedded]) {
      expect(className).toContain('flex gap-2 p-2 rounded-md cursor-pointer');
    }
  });
});
