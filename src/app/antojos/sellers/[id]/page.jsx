import SellerPage from '@/components/seller/SellerPage'
import React from 'react'
import { getSellerForMetadata } from '@/server/sellers/getSellerForMetadata'
import { buildSellerMetadata } from '@/lib/metadata'

// T-69: see the equivalent note in antojos/[id]/page.jsx, same case for the
// seller profile.
export async function generateMetadata({ params }) {
  const seller = await getSellerForMetadata(params.id);
  if (!seller) return {};
  return buildSellerMetadata(seller);
}

export default function page({params}) {
  const { id } = params;
  return (
    <> <SellerPage id={id}/> </>
  )
}
