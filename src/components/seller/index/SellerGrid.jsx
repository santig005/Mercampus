import React, { useRef, useEffect, useState } from 'react';
import SellerCard from '@/components/seller/index/SellerCard';
import SellerModal from '@/components/seller/index/SellerModal';
import { useAutoAnimate } from '@formkit/auto-animate/react';

export default function SellerGrid({ sellers }) {
  const [clickedSellerId, setClickedSellerId] = useState(null);
  const [parent] = useAutoAnimate();
  const containerRef = useRef(null);

  const handleSellerClick = (id) => {
    setClickedSellerId(id);
    document.getElementById(id).showModal();
  };

  const handleClickOutside = (event) => {
    if (containerRef.current && !containerRef.current.contains(event.target)) {
      setClickedSellerId(null);
    }
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  return (
    <div className='' ref={containerRef}>
      <div className='flex flex-col gap-2' ref={parent}>
      {Array.isArray(sellers) && sellers.map((seller) => (
        <div key={seller._id}>
          <SellerCard
            seller={seller}
            isClicked={clickedSellerId === seller._id}
            onClick={() => handleSellerClick(seller._id)}
          />
          <SellerModal seller={seller} />
        </div>
      ))}
      </div>
    </div>
  );
}
