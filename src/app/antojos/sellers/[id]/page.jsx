import SellerPage from '@/components/seller/SellerPage'
import React from 'react'
import { notFound } from 'next/navigation'
import { getSellerForMetadata } from '@/server/sellers/getSellerForMetadata'
import { buildSellerMetadata } from '@/lib/metadata'

// T-69: see the equivalent note in antojos/[id]/page.jsx, same case for the
// seller profile.
// T-90 (audit findings F1 and F2): the id is resolved here, not only in the
// page body, and that is not a style choice. notFound() thrown from the page
// renders the 404 but leaves the status at **200**: the root layout has already
// started streaming by the time the Mongo read resolves, so the status line is
// gone. generateMetadata runs before any of that, which is the only place the
// status can still be set. Measured, not assumed - a route that does not exist
// at all returned 404 while these returned 200.
export async function generateMetadata({ params }) {
  const seller = await getSellerForMetadata(params.id);
  if (!seller) notFound();
  return buildSellerMetadata(seller);
}

// T-90 (audit finding F2): an id that does not exist used to spin forever.
// SellerPage logs "Error fetching seller: Seller not found" to the console and
// leaves the loading state up - no error, no empty state, no way out. Resolving
// here turns it into a 404 before the client component ever mounts.
// The page body checks again on purpose. The metadata call above is what makes
// the status a real 404; this is what guarantees the product chrome - the NaN
// price, the live WhatsApp button - never renders if that ever stops running
// first. One extra call, zero extra queries: the read is cached per request.
export default async function page({ params }) {
  const { id } = params;
  const seller = await getSellerForMetadata(id);
  if (!seller) notFound();

  return (
    <> <SellerPage id={id}/> </>
  )
}
