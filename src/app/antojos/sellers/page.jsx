'use client';
import SellerIndex from '@/components/seller/index/SellerIndex';
import React, { useEffect, useState } from 'react';
function Sellers() {
const [sellers, setSellers] =useState([]);

    useEffect(() => {
        async function fetchSellers() {
            try {
                const response = await fetch('/api/sellers/index2');
                const data = await response.json();
                console.log(data.sellers);
                setSellers(data.sellers);
            } catch (error) {
                console.error('Error fetching sellers:', error);
            }
        }

        fetchSellers();
    }, []);

  return (
    <div>
        <h1>Nuestros vendedores</h1>
      <SellerIndex sellers={sellers} />
    </div>
  );
}

export default Sellers;