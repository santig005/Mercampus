'use client';

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { localizedHref, routing, stripLocalePrefix } from '@/i18n/routing';

// Plain <a> tags on purpose: NextIntlClientProvider lives in the root
// layout (src/app/layout.jsx), which Next.js keeps mounted across
// client-side navigation, so a soft nav via next/link would leave the
// translations stuck on the locale from the first page load. A full
// navigation re-runs the root layout and picks up the new locale
// everywhere (translations, <html lang>, Clerk localization).
//
// A client component only so it can read the live pathname. It used to be a
// server component taking a `basePath` prop, which each layout hardcoded -
// correct while a layout wrapped a single page, wrong as soon as one wrapped
// several: from /antojos/sellers/list or a product page, the switcher sent
// the visitor to /en/antojos instead of that page's own twin. The pathname
// is the one source that cannot go stale as more zones migrate.
//
// Still does not preserve query params (sort/category/availability filters),
// matching the behaviour every zone has shipped with so far.
export default function LocaleSwitcher() {
  const pathname = usePathname();
  const activeLocale = useLocale();
  const t = useTranslations('LocaleSwitcher');

  const defaultLocalePath = stripLocalePrefix(pathname);

  return (
    <div className="flex items-center gap-2 text-sm sm:text-base">
      {routing.locales.map((locale) => (
        <a
          key={locale}
          href={localizedHref(defaultLocalePath, locale)}
          className={
            locale === activeLocale
              ? 'font-semibold text-orange-600'
              : 'text-gray-500 dark:text-base-content/70 hover:text-orange-600'
          }
          aria-current={locale === activeLocale ? 'true' : undefined}
        >
          {t(locale)}
        </a>
      ))}
    </div>
  );
}
