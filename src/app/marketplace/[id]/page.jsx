import ProductPage from '@/components/products/ProductPage'
import React from 'react'
import { notFound } from 'next/navigation'
import { getProductForMetadata } from '@/server/products/getProductForMetadata'
import { buildProductMetadata } from '@/lib/metadata'

// T-69: see the note in antojos/[id]/page.jsx - same product, same
// metadata, only the section the page is shown in changes.
// T-90 (audit findings F1 and F2): the id is resolved here, not only in the
// page body, and that is not a style choice. notFound() thrown from the page
// renders the 404 but leaves the status at **200**: the root layout has already
// started streaming by the time the Mongo read resolves, so the status line is
// gone. generateMetadata runs before any of that, which is the only place the
// status can still be set. Measured, not assumed - a route that does not exist
// at all returned 404 while these returned 200.
export async function generateMetadata({ params }) {
  const product = await getProductForMetadata(params.id);
  if (!product) notFound();
  return buildProductMetadata(product);
}

// T-90 (audit finding F1): same dead end as antojos/[id], same fix. The audit
// only walked the antojos route, but this page renders the same component from
// the same id.
// The page body checks again on purpose. The metadata call above is what makes
// the status a real 404; this is what guarantees the product chrome - the NaN
// price, the live WhatsApp button - never renders if that ever stops running
// first. One extra call, zero extra queries: the read is cached per request.
export default async function page({ params }) {
  const { id } = params;
  const product = await getProductForMetadata(id);
  if (!product) notFound();

  return (
    <> <ProductPage id={id} section="marketplace"/> </>
  )
}
