import ProductPage from '@/components/products/ProductPage'
import React from 'react'
import { getProductForMetadata } from '@/server/products/getProductForMetadata'
import { buildProductMetadata } from '@/lib/metadata'

// T-69: see the note in antojos/[id]/page.jsx - same product, same
// metadata, only the section the page is shown in changes.
export async function generateMetadata({ params }) {
  const product = await getProductForMetadata(params.id);
  if (!product) return {};
  return buildProductMetadata(product);
}

export default function page({params}) {
  const { id } = params;
  return (
    <> <ProductPage id={id} section="marketplace"/> </>
  )
}
