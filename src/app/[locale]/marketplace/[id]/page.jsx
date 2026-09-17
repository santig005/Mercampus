import ProductPage from '@/components/products/ProductPage'
import React from 'react'
import { notFound } from 'next/navigation'
import { getProductForMetadata } from '@/server/products/getProductForMetadata'
import { buildProductMetadata } from '@/lib/metadata'

// T-81 (product detail zone): see the comment in
// src/app/[locale]/antojos/[id]/page.jsx - same migration, same reasoning
// (moved from the now-deleted src/app/marketplace/[id]/page.jsx), only the
// `section` prop differs.
export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProductForMetadata(id);
  if (!product) notFound();
  return buildProductMetadata(product);
}

export default async function page({ params }) {
  const { id } = await params;
  const product = await getProductForMetadata(id);
  if (!product) notFound();

  return (
    <> <ProductPage id={id} section="marketplace"/> </>
  )
}
