import { getLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

// Plain <a> tags on purpose: NextIntlClientProvider lives in the root
// layout (src/app/layout.jsx), which Next.js keeps mounted across
// client-side navigation, so a soft nav via next/link would leave the
// translations stuck on the locale from the first page load. A full
// navigation re-runs the root layout and picks up the new locale
// everywhere (translations, <html lang>, Clerk localization).
//
// `basePath` is the current page's route under a locale prefix (e.g.
// 'about', 'antojos', 'marketplace') with no leading slash - it does not
// preserve query params (sort/category/availability filters on the listing
// pages), matching how the /about switcher already behaves.
export default async function LocaleSwitcher({ basePath }) {
  const activeLocale = await getLocale();
  const t = await getTranslations('LocaleSwitcher');

  return (
    <div className="flex items-center gap-2 text-sm sm:text-base">
      {routing.locales.map((locale) => (
        <a
          key={locale}
          href={locale === routing.defaultLocale ? `/${basePath}` : `/${locale}/${basePath}`}
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
