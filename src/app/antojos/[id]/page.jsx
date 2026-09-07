import ProductPage from '@/components/products/ProductPage'
import React from 'react'
import { getProductForMetadata } from '@/server/products/getProductForMetadata'
import { buildProductMetadata } from '@/lib/metadata'

// T-69: sin esto, compartir un producto (WhatsApp, Instagram) mostraba la
// metadata generica del layout raiz - mismo titulo/imagen para cualquier
// producto.
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
