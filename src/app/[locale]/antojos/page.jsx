import { getTranslations, setRequestLocale } from 'next-intl/server';

import AntojosListing from '@/components/products/AntojosListing';

// T-152: a Server Component only so this route can have metadata of its own.
// The listing itself (session greeting, search, grid) is interactive and
// lives in AntojosListing. Before this, the page was 'use client' and could
// not export metadata, so /antojos - where every visit to `/` lands -
// rendered the root layout's generic title and description.
//
// The title is the bare name; the root layout's template adds " · Mercampus"
// (T-76).
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Antojos' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function page({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AntojosListing />;
}
