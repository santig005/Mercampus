import ProductPage from '@/components/products/ProductPage'
import React from 'react'
import { getProductForMetadata } from '@/server/products/getProductForMetadata'
import { buildProductMetadata } from '@/lib/metadata'

// T-69: ver la nota en antojos/[id]/page.jsx - mismo producto, misma
// metadata, solo cambia la seccion en la que se muestra la pagina.
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
