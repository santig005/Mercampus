import SellerPage from '@/components/seller/SellerPage'
import React from 'react'

export default function page({params}) {
  const { id } = params;
  return (
    <> <SellerPage id={id}/> </>
  )
}
