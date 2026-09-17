import ProductPage from '@/components/products/ProductPage'
import React from 'react'
import { notFound } from 'next/navigation'
import { getProductForMetadata } from '@/server/products/getProductForMetadata'
import { buildProductMetadata } from '@/lib/metadata'

// T-81 (product detail zone): moved from src/app/antojos/[id]/page.jsx
// (deleted). Once a request matches the `dynamic` LOCALIZED_ROUTES entry for
// '/antojos' (src/i18n/routing.ts, buildDynamicPattern), isIntlRoute rewrites
// it to include the locale segment before Next's file router ever sees the
// un-prefixed path - the same mechanism the listing zone's index pages use
// (see src/app/[locale]/antojos/page.jsx) - so the old sibling file at
// src/app/antojos/[id]/page.jsx was never reached again for this URL shape
// and was deleted rather than left dead. It is wrapped by the existing
// src/app/[locale]/antojos/layout.jsx, unchanged - no new layout needed.
//
// T-69/T-90 (F1, F2): the id is resolved here, not only in the page body -
// notFound() thrown from the page renders the 404 but leaves the status at
// 200 (the root layout has already started streaming by the time the Mongo
// read resolves), so generateMetadata is the only place the status can still
// be set. Same reasoning as the deleted file; see its git history for the
// full note.
export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProductForMetadata(id);
  if (!product) notFound();
  return buildProductMetadata(product);
}

// The page body checks again on purpose - see the deleted file's note this
// was copied from: one extra call, zero extra queries (the read is cached
// per request), and it guarantees the product chrome (NaN price, a live
// WhatsApp button) never renders if generateMetadata's check ever stops
// running first.
export default async function page({ params }) {
  const { id } = await params;
  const product = await getProductForMetadata(id);
  if (!product) notFound();

  return (
    <> <ProductPage id={id}/> </>
  )
}
