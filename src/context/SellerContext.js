'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { getSellerByEmail } from '@/services/sellerService';
const SellerContext = createContext(null);

export const SellerProvider = ({ children }) => {
  const { user } = useUser();
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeller = async () => {
      if (!user) {
        // No user logged in: stop loading and leave seller as null.
        setLoading(false);
        return;
      }

      try {
        // Retrieve the primary email address (if available)
        const email = user.primaryEmailAddress?.emailAddress;
        if (email) {
          const sellerData = await getSellerByEmail(email);
          setSeller(sellerData);
        }
        //console.log("el seller en back es ",seller);
      } catch (error) {
        console.error('Error fetching seller:', error);
        setSeller(false);
      } finally {
        setLoading(false);
      }
    };

    fetchSeller();
  }, [user]); // Only refetch when `user` changes

  return (
    <SellerContext.Provider value={{ seller, loading }}>
      {children}
    </SellerContext.Provider>
  );
};

// Custom hook for easier context consumption.
export const useSeller = () => {
  const context = useContext(SellerContext);
  if (context === undefined) {
    throw new Error('useSeller must be used within a SellerProvider');
  }
  return context;
};