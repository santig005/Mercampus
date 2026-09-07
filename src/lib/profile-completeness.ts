import { DEFAULT_SELLER_LOGO } from '@/utils/models/sellerSchema2';

// T-72. Which parts of a seller's profile are still empty. Pure and derived:
// no new field on Seller, no migration - every input already exists.
//
// Lives apart from the data access (src/server/sellers/getProfileChecklist)
// so the rules can be unit tested without a database.

export type ProfileChecklistInput = {
  logo?: string | null;
  description?: string | null;
  scheduleCount: number;
  productCount: number;
};

export type ChecklistItem = {
  id: 'logo' | 'description' | 'schedule' | 'product';
  label: string;
  hint: string;
  done: boolean;
  href?: string;
};

export type ProfileChecklist = {
  items: ChecklistItem[];
  completed: number;
  total: number;
  percent: number;
};

// `logo` is never empty - the schema fills in DEFAULT_SELLER_LOGO - so "has a
// logo" means "has one that isn't the placeholder". Measured against the real
// database: 6 of the 7 approved sellers without a real logo carry exactly that
// placeholder, so a truthiness check would have marked 6 of them complete.
export function hasCustomLogo(logo?: string | null): boolean {
  return Boolean(logo) && logo !== DEFAULT_SELLER_LOGO;
}

const isFilled = (value?: string | null): boolean =>
  typeof value === 'string' && value.trim().length > 0;

export function buildProfileChecklist({
  logo,
  description,
  scheduleCount,
  productCount,
}: ProfileChecklistInput): ProfileChecklist {
  const items: ChecklistItem[] = [
    {
      id: 'logo',
      label: 'Sube el logo de tu negocio',
      hint: 'Una foto propia hace que te reconozcan en el listado.',
      done: hasCustomLogo(logo),
    },
    {
      id: 'description',
      label: 'Escribe una descripción',
      hint: 'Cuenta en una línea qué vendes y qué te diferencia.',
      done: isFilled(description),
    },
    {
      id: 'schedule',
      label: 'Agrega tu horario',
      hint: 'Sin horario nunca apareces como disponible.',
      done: scheduleCount > 0,
      href: '/antojos/sellers/schedules',
    },
    {
      id: 'product',
      label: 'Publica tu primer producto',
      hint: 'Tu perfil se ve vacío hasta que tengas al menos uno.',
      done: productCount > 0,
      href: '/antojos/product/add',
    },
  ];

  const completed = items.filter(item => item.done).length;

  return {
    items,
    completed,
    total: items.length,
    percent: Math.round((completed / items.length) * 100),
  };
}
