import { DEFAULT_SELLER_LOGO } from '@/utils/models/sellerSchema';

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

// T-81 (seller profile/schedule zone): `label`/`hint` used to live here as
// hardcoded Spanish - moved to messages/{es,en}.json's `ProfileChecklist`
// namespace, keyed by `id`, since a pure function can't call `useTranslations`.
// This file stays pure data.
export type ChecklistItem = {
  id: 'logo' | 'description' | 'schedule' | 'product';
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
      done: hasCustomLogo(logo),
    },
    {
      id: 'description',
      done: isFilled(description),
    },
    {
      id: 'schedule',
      done: scheduleCount > 0,
      href: '/antojos/sellers/schedules',
    },
    {
      id: 'product',
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
