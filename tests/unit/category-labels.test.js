import { describe, expect, it } from 'vitest';
import { categoryMessageKey } from '@/lib/category-labels';
import { antojosCategories } from '@/utils/resources/categories';
import { marketplaceCategories } from '@/utils/resources/marketplaceCategories';
import { categoriesList } from '@/utils/categoriesList';
import { marketplaceCategoriesList } from '@/utils/marketplaceCategoriesList';
import es from '../../messages/es.json';
import en from '../../messages/en.json';

// Category values are stored, validated and filtered on as Spanish strings;
// only their labels are translated (src/lib/category-labels.ts). A category
// added to any of these lists without a key would silently render untranslated
// in English, so every list is checked here.
const everyValue = [
  ...antojosCategories,
  ...marketplaceCategories,
  ...categoriesList.map(category => category.name),
  ...marketplaceCategoriesList.map(category => category.name),
];

describe('category labels', () => {
  it.each([...new Set(everyValue)])('"%s" has a message key in both locales', value => {
    const key = categoryMessageKey(value);
    expect(key).not.toBeNull();
    expect(en.Categories[key]).toEqual(expect.any(String));
    // The Spanish label IS the stored value: nothing a Spanish visitor sees
    // changes, and the value can be read straight off the chip.
    expect(es.Categories[key]).toBe(value);
  });

  it('returns null for a value it does not know, so callers show it as stored', () => {
    expect(categoryMessageKey('Categoría retirada')).toBeNull();
    // Not fooled by Object.prototype.
    expect(categoryMessageKey('toString')).toBeNull();
  });
});
