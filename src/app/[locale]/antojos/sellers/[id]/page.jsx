import SellerPage from '@/components/seller/SellerPage'
import React from 'react'
import { notFound } from 'next/navigation'
import { getSellerForMetadata } from '@/server/sellers/getSellerForMetadata'
import { buildSellerMetadata } from '@/lib/metadata'

// T-81 (seller profile zone): moved from src/app/antojos/sellers/[id]/page.jsx
// (deleted). Once a request matches the `dynamic` LOCALIZED_ROUTES entry for
// '/antojos/sellers' (src/i18n/routing.ts, buildDynamicPattern), isIntlRoute
// rewrites it to include the locale segment before Next's file router ever
// sees the un-prefixed path - same mechanism as the product detail zone (see
// src/app/[locale]/antojos/[id]/page.jsx) - so the old sibling file was never
// reached again for this URL shape and was deleted rather than left dead. It
// is wrapped by the existing src/app/[locale]/antojos/layout.jsx, unchanged -
// no new layout needed.
//
// T-69/T-90 (F1, F2): the id is resolved here, not only in the page body -
// notFound() thrown from the page renders the 404 but leaves the status at
// 200 (the root layout has already started streaming by the time the Mongo
// read resolves), so generateMetadata is the only place the status can still
// be set. Same reasoning as the deleted file; see its git history for the
// full note.
export async function generateMetadata({ params }) {
  const { id } = await params;
  const seller = await getSellerForMetadata(id);
  if (!seller) notFound();
  return buildSellerMetadata(seller);
}

// The page body checks again on purpose - see the deleted file's note this
// was copied from: one extra call, zero extra queries (the read is cached
// per request), and it guarantees the seller chrome never renders if
// generateMetadata's check ever stops running first.
export default async function page({ params }) {
  const { id } = await params;
  const seller = await getSellerForMetadata(id);
  if (!seller) notFound();

  return (
    <> <SellerPage id={id}/> </>
  )
}
