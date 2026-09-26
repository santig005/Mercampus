import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import LocaleSwitcher from '@/components/general/LocaleSwitcher';
import StickyTopbar from '@/components/general/StickyTopbar';
import { localizedHref } from '@/i18n/routing';
import { SITE_NAME } from '@/lib/metadata';
import { buildOrganizationJsonLd, serializeJsonLd } from '@/lib/structured-data';

// T-152b: this was src/app/[locale]/about/. The (landing) route group adds
// no URL segment, so the same layout and page now serve `/` and `/en`, and
// /about is a permanent redirect here (next.config.mjs). The copy is
// unchanged - the human decided on 2026-09-26 that the landing moves as it
// is.
//
// Metadata: the root layout's default is just "Mercampus" with a generic
// description, which is what the home page would otherwise inherit. The
// title is absolute because the template would turn it into
// "Mercampus · Mercampus"-style noise; the words come from the hero, so the
// title says what the page says.
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'About' });
  return {
    title: { absolute: `${SITE_NAME} · ${t('hero.subtitle')}` },
    description: t('hero.description'),
  };
}

export default async function layout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('AboutLayout');
  // T-81: a bare href would drop the locale on a soft nav from /en/about to
  // /antojos, landing on the Spanish URL while the root layout - frozen
  // across client-side navigation - keeps rendering English (see
  // src/i18n/routing.ts for the full story).
  const antojosHref = localizedHref('/antojos', locale);

  return (
    <div className='w-full'>
      {/* T-152c: Organization markup, once, on the home page only (this
          layout serves `/` and `/en` and nothing else). */}
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildOrganizationJsonLd()) }}
      />
      {/* Topbar */}
      <StickyTopbar>
        <div className="mx-auto px-4 sm:px-6 py-3 sm:py-4 container">
          {/* T-152d: below `sm` this row does not fit. Measured: logo +
              wordmark 143px, locale switcher 117px, and the explore button
              84px even with its short label - about 396px with padding and
              gaps, on a 390px phone. The wordmark got squeezed under the
              switcher at every width under 640px, and at 320px the button
              ran off the screen. So under `sm` the button goes (the hero,
              right below, has the same "Explorar productos" call to action),
              and the logo can no longer shrink. */}
          <div className="flex items-center justify-between gap-3">
            {/* Logo */}
            <Link href={antojosHref} className="flex shrink-0 items-center space-x-2">
              <Image
                src="/images/logo.png"
                alt={t('logoAlt')}
                width={32}
                height={32}
                className="w-6 h-6 sm:w-8 sm:h-8"
              />
              <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-base-content drop-shadow-sm">Mercampus</span>
            </Link>

            <div className="flex items-center gap-3 sm:gap-4">
              <LocaleSwitcher />

              {/* Explore products button */}
              <Link
                href={antojosHref}
                className="hidden sm:inline-block whitespace-nowrap bg-orange-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors duration-200 shadow-md hover:shadow-lg text-base"
              >
                {t('exploreLong')}
              </Link>
            </div>
          </div>
        </div>
      </StickyTopbar>

      {children}
    </div>
  );
}
