import { describe, expect, it } from 'vitest';

import { localizedHref } from '@/i18n/routing';

describe('localizedHref (T-81)', () => {
  it('prefixes an exact locale-aware route for a non-default locale', () => {
    expect(localizedHref('/antojos', 'en')).toBe('/en/antojos');
    expect(localizedHref('/marketplace', 'en')).toBe('/en/marketplace');
    expect(localizedHref('/about', 'en')).toBe('/en/about');
  });

  it('never prefixes for the default locale', () => {
    expect(localizedHref('/antojos', 'es')).toBe('/antojos');
    expect(localizedHref('/about', 'es')).toBe('/about');
  });

  // The trap this task fixes: /about owns its whole subtree (matchSubpaths:
  // true, same as isIntlRoute's own '/about(.*)'), so a link to a page under
  // it must be prefixed too, or a soft nav from /en/about/team would land on
  // the bare (Spanish) URL while the root layout - frozen since Next does
  // not re-run it on a client-side navigation - keeps rendering English.
  it('prefixes a subpath under a matchSubpaths:true route', () => {
    expect(localizedHref('/about/team', 'en')).toBe('/en/about/team');
  });

  // /antojos and /marketplace are matchSubpaths:false on purpose: their
  // sub-routes (/antojos/sellers/list, /antojos/product/add, ...) have no
  // [locale] file, so prefixing them would 404.
  it('does not prefix a subpath under a matchSubpaths:false route', () => {
    expect(localizedHref('/antojos/sellers/list', 'en')).toBe(
      '/antojos/sellers/list'
    );
    expect(localizedHref('/antojos/product/add', 'en')).toBe(
      '/antojos/product/add'
    );
  });

  it('leaves an unrelated path untouched', () => {
    expect(localizedHref('/auth/login', 'en')).toBe('/auth/login');
  });
});
