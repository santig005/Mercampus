import BottomNav from '@/components/header/Header';
import React from 'react';

export default function layout({ children }) {
  return (
    <>
      <BottomNav>{children}</BottomNav>
    </>
  );
}
