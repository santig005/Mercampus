import ProductPage from '@/components/products/ProductPage'
import React from 'react'

export default function page({params}) {
  const { id } = params;
  return (
    <> <ProductPage id={id} section="marketplace"/> </>
  )
}
