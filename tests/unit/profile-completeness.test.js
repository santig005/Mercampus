import { describe, expect, it } from 'vitest';

import { buildProfileChecklist, hasCustomLogo } from '@/lib/profile-completeness';
import { DEFAULT_SELLER_LOGO } from '@/utils/models/sellerSchema2';

const complete = {
  logo: 'https://ik.imagekit.io/seed/mi-logo.png',
  description: 'Arepas recién hechas entre clases.',
  scheduleCount: 3,
  productCount: 5,
};

describe('hasCustomLogo (T-72)', () => {
  // The case that has to be right: the schema gives EVERY seller a default
  // logo, so asking `if (seller.logo)` is always true. Measured against the
  // real database: 6 of the 7 approved sellers without a logo of their own
  // carry exactly this placeholder.
  it('el logo por defecto no cuenta como logo propio', () => {
    expect(hasCustomLogo(DEFAULT_SELLER_LOGO)).toBe(false);
  });

  it('un logo subido por el vendedor si cuenta', () => {
    expect(hasCustomLogo('https://ik.imagekit.io/seed/mi-logo.png')).toBe(true);
  });

  it('sin logo tampoco cuenta', () => {
    expect(hasCustomLogo(undefined)).toBe(false);
    expect(hasCustomLogo('')).toBe(false);
  });
});

describe('buildProfileChecklist (T-72)', () => {
  it('un perfil completo marca los 4 items y 100%', () => {
    const checklist = buildProfileChecklist(complete);

    expect(checklist.completed).toBe(4);
    expect(checklist.total).toBe(4);
    expect(checklist.percent).toBe(100);
    expect(checklist.items.every(item => item.done)).toBe(true);
  });

  it('un perfil recien creado no marca nada', () => {
    const checklist = buildProfileChecklist({
      logo: DEFAULT_SELLER_LOGO,
      description: undefined,
      scheduleCount: 0,
      productCount: 0,
    });

    expect(checklist.completed).toBe(0);
    expect(checklist.percent).toBe(0);
  });

  it('una descripcion en blanco no cuenta como escrita', () => {
    const checklist = buildProfileChecklist({ ...complete, description: '   ' });

    expect(checklist.items.find(item => item.id === 'description').done).toBe(false);
    expect(checklist.completed).toBe(3);
  });

  it('un solo horario o un solo producto ya alcanzan', () => {
    const checklist = buildProfileChecklist({
      ...complete,
      scheduleCount: 1,
      productCount: 1,
    });

    expect(checklist.completed).toBe(4);
  });

  it('el porcentaje sale redondeado, no con decimales', () => {
    const checklist = buildProfileChecklist({ ...complete, productCount: 0 });

    expect(checklist.percent).toBe(75);
  });

  it('los items que llevan a otra pantalla traen su enlace', () => {
    const { items } = buildProfileChecklist(complete);
    const byId = Object.fromEntries(items.map(item => [item.id, item]));

    expect(byId.schedule.href).toBe('/antojos/sellers/schedules');
    expect(byId.product.href).toBe('/antojos/product/add');
    // Logo and description are edited in this very form, below the
    // checklist: no tienen a donde navegar.
    expect(byId.logo.href).toBeUndefined();
    expect(byId.description.href).toBeUndefined();
  });
});
