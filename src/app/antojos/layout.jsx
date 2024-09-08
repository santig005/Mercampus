import BottomNav from '@/components/bottom-nav/BottomNav';
import React from 'react';

export default function layout({ children }) {
  return (
    <>
      <BottomNav>{children}</BottomNav>
    </>
  );
}
