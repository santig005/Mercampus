'use client';
import { createContext, useState, useContext, useEffect } from 'react';
import { useLocalStorage } from '@/utils/hooks/useLocalStorage';
import { universities } from '@/utils/resources/universities';

const UniversityContext = createContext();

export const UniversityProvider = ({ children }) => {
  const defaultUniversity = universities.length > 0 ? universities[0] : '';
  const [university, setUniversity] = useLocalStorage('selectedUniversity', defaultUniversity);

  return (
    <UniversityContext.Provider value={{ university, setUniversity }}>
      {children}
    </UniversityContext.Provider>
  );
};

export const useUniversity = () => useContext(UniversityContext);
