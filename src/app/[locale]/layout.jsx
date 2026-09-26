import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { isSupportedLocale } from '@/lib/route-guards';

// T-81 (middleware gate): the one place that decides which locale segments
// exist at all.
//
// [locale] is a catch-all. Next hands it ANY single path segment, there is no
// generateStaticParams or dynamicParams narrowing it, and src/i18n/request.ts
// falls back to the default locale for a locale it does not recognise instead
// of failing. Measured before this file existed: /xx/antojos and /zz/antojos
// both answered HTTP 200 and rendered the Spanish page.
//
// On a public page that is cosmetic - a nonsense URL serving real, indexable
// content. On a gated page it is an auth bypass, and the reason this file had
// to land before the seller's forms move under [locale]: middleware.js gates
// a path plus one twin per locale in routing.locales, and '/xx/...' is not a
// twin that set can contain, because there are infinitely many of them.
// Proven with a throwaway page at [locale]/antojos/sellers/profile/edit: with
// no session, /en/... and /xx/... both rendered it (HTTP 200) while the bare
// path correctly redirected to the login. See ROADMAP.md T-81.
//
// Returning `children` unchanged keeps this a gate and nothing else - no
// wrapper element, no markup, so every zone's own layout renders exactly as
// it did before.
export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;

  if (!isSupportedLocale(locale)) {
    notFound();
  }

  // Hoisted here from the individual zone layouts' own calls (which stay, and
  // are harmless): with a parent layout in place this is the natural place to
  // opt the whole subtree into static rendering, and it now runs for zones
  // whose layout never called it.
  setRequestLocale(locale);

  return children;
}
