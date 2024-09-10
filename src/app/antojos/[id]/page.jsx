'use client';

import HomeProduct from '@/components/layout/HomeProduct';
import React from 'react';

// const URL = process.env.NEXT_PUBLIC_URL;
// export async function generateStaticParams() {
//   const antojos = await fetch(`${URL}/api/products`).then(res => res.json());

//   return antojos.map(antojo => ({
//     id: antojo._id,
//   }));
// }

export default function Antojo({ params }) {
  // const { id } = params;
  return (
    <>
      <HomeProduct id={params.id} />
    </>
  );
}
