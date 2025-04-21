// src/components/university/UniversitySelector.jsx
'use client';
import React from 'react';
import { useUniversity } from '@/context/UniversityContext';
import {universities} from '@/utils/resources/universities';
import UniGraphicSelector from '@/components/university/UniGraphicSelector';

const UniversitySelector = ({ }) => {
  const { university, setUniversity } = useUniversity();

  return (
    <UniGraphicSelector 
      value={university}
      onUniversityChange={setUniversity}
    />
  );
};

export default UniversitySelector;
