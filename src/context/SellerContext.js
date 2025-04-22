// SellerContext.js
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getUserWithSellerByEmail } from "@/services/userService";
import { useRouter } from "next/navigation";

const SellerContext = createContext(null);

export const SellerProvider = ({ children }) => {
  const { user, isLoaded } = useUser();
  const [seller, setSeller] = useState("Loading");
  const [dbUser, setDbUser] = useState("Loading");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeller = async () => {
      if (!isLoaded) {
        return;
      }
      if (!user) {
        setLoading(false);
        setSeller(false);
        setDbUser(false);
        return;
      }

      try {
        const email = user.primaryEmailAddress?.emailAddress;
        if (email) {
            const response = await getUserWithSellerByEmail(email);
          const { user: dbUser, seller } = response;
          if (seller) {
            setSeller(seller);
          } else {
            setSeller("None");
          }
          if (dbUser) {
            setDbUser(dbUser);
          } else {
            setDbUser("None");
          }
        } else {
          setSeller(false);
        }
      } catch (error) {
        console.error("Error fetching seller:", error);
        setSeller(false);
      } finally {
        setLoading(false);
      }
    };

    fetchSeller();
  }, [user, isLoaded]);

  return (
    <SellerContext.Provider value={{ seller, setSeller, loading, dbUser, setDbUser }}>
      {children}
    </SellerContext.Provider>
  );
};

// Custom hook para consumir el contexto
export const useSeller = () => {
  const context = useContext(SellerContext);
  if (context === undefined) {
    throw new Error("useSeller must be used within a SellerProvider");
  }
  return context;
};


/* "use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { getSellerByEmail } from "@/services/sellerService";
import { getUserByEmail } from "@/services/userService";
import { useRouter } from "next/navigation";
const SellerContext = createContext(null);

export const SellerProvider = ({ children }) => {
  const { user,isLoaded } = useUser();
  const [seller, setSeller] = useState("Loading");
  const [dbUser, setDbUser] = useState("Loading");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSeller = async () => {
      if(!isLoaded){
        return;
      }
      if (!user) {
        setLoading(false);
        setSeller(false);
        setDbUser(false);
        return;
      }

      try {
        // Retrieve the primary email address (if available)
        const email = user.primaryEmailAddress?.emailAddress;
        if (email) {
          const sellerData = await getSellerByEmail(email);
          if(sellerData)setSeller(sellerData.seller);
          else setSeller("None")
          
          const userData = await getUserByEmail(email);
          if(userData)setDbUser(userData);
          else setDbUser("None")
        } else {
          setSeller(false);
        }
      } catch (error) {
        console.error("Error fetching seller:", error);
        setSeller(false);
      } finally {
        setLoading(false);
      }
    };

    fetchSeller();
  }, [user,isLoaded]); // Only refetch when `user` changes

  return (
    <SellerContext.Provider value={{ seller, setSeller, loading, dbUser,setDbUser }}>
      {children}
    </SellerContext.Provider>
  );
};

// Custom hook for easier context consumption.
export const useSeller = () => {
  const context = useContext(SellerContext);
  if (context === undefined) {
    throw new Error("useSeller must be used within a SellerProvider");
  }
  return context;
}; */

/**
 * Hook to check the seller's status and redirect based on their condition.
 *
 * @param {string} sellerAllowed - Specifies the required seller status.
 *    Possible values:
 *      - "sellerApproved": The seller must be approved.
 *      - "sellerNotApproved": The seller must not be approved.
 * @param {string} routeIfNot - The route to redirect to if the seller's status does not meet
 *    the condition specified by sellerAllowed.
 *
 * Behavior:
 * - If there is no user (dbUser is missing), it redirects to "/auth/login".
 * - Once loading is complete and if no seller information is available, it redirects to "/antojos/sellers/register".
 * - If seller information exists:
 *    - When sellerAllowed is "sellerApproved" and the seller is not approved, it redirects to routeIfNot.
 *    - When sellerAllowed is "sellerNotApproved" and the seller is approved, it redirects to routeIfNot.
 *
 * Usage examples:
 *
 * // Page that should only be accessible to approved sellers.
 * useCheckSeller("sellerApproved", "/antojos/sellers/schedules");
 *
 * // Page that should only be accessible to non-approved sellers.
 * useCheckSeller("sellerNotApproved", "/destination/for/non-approved");
 */
export const useCheckSeller = (sellerAllowed,routeIfNot) => {
  const router = useRouter();
  const { seller, loading: sellerLoading, dbUser } = useSeller();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
      if (!dbUser) {
        router.push("/auth/login");
        return;
      } 
      if (!sellerLoading) {
        if(sellerAllowed!=="userNotSeller"){
          if (seller) {
            if("sellerNotApproved" === sellerAllowed) {
              if (seller.approved) router.push(routeIfNot);
              else setChecked(true);
            }
            if ("sellerApproved" === sellerAllowed) {
              if (!seller.approved) router.push(routeIfNot);
              else setChecked(true);
            }
          } else {
            router.push("/antojos/sellers/register");
          }
        }
        else{
          if (seller) {
            if (seller.approved) {
              router.push("/antojos/sellers/profile/edit");
            }
            else{
              router.push("/antojos/sellers/approving");
            }
          }
          else setChecked(true);
        }
      }
  }, [dbUser, seller, sellerLoading, router, sellerAllowed, routeIfNot]);
  return {checkedSeller:checked};
};

