import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { categoryMessageKey } from '@/lib/category-labels';

// Returns a function from a stored category value to the label to show in
// the current locale. The value itself never changes (see
// src/lib/category-labels.ts); an unknown one is shown as stored.
export function useCategoryLabel() {
  const t = useTranslations('Categories');
  return useCallback(
    value => {
      const key = categoryMessageKey(value);
      return key ? t(key) : value;
    },
    [t]
  );
}
