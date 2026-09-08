import ProductPage from '@/components/products/ProductPage'
import React from 'react'
import { getProductForMetadata } from '@/server/products/getProductForMetadata'
import { buildProductMetadata } from '@/lib/metadata'

// T-69: without this, sharing a product (WhatsApp, Instagram) showed the
// root layout's generic metadata - the same title and image for every
// product.
export async function generateMetadata({ params }) {
  const product = await getProductForMetadata(params.id);
  if (!product) return {};
  return buildProductMetadata(product);
}

export default function page({params}) {
  const { id } = params;
  return (
    <> <ProductPage id={id}/> </>
  )
}
