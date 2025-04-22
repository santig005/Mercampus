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
            console.log("voy por mi user with seller desde context 2");
            const response = await getUserWithSellerByEmail(email);
            console.log("La response en get uws es ");
            console.log(response);
          const { user: dbUser, seller } = response;
          console.log("ya en context 2");
          console.log("el seller es ");
          console.log(seller);
          console.log("el user es ");
          console.log(dbUser);
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
  console.log("hemos entrado al vendedor")
  const context = useContext(SellerContext);
  if (context === undefined) {
    throw new Error("useSeller must be used within a SellerProvider");
  }
  return context;
};

// Hook useCheckSeller (sin cambios necesarios aquí)
export const useCheckSeller = (sellerAllowed, routeIfNot) => {
  const router = useRouter();
  const { seller, loading: sellerLoading, dbUser } = useSeller();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!dbUser) {
      router.push("/auth/login");
      return;
    }
    if (!sellerLoading) {
      if (sellerAllowed !== "userNotSeller") {
        if (seller) {
          if ("sellerNotApproved" === sellerAllowed) {
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
      } else {
        if (seller) {
          if (seller.approved) {
            router.push("/antojos/sellers/profile/edit");
          } else {
            router.push("/antojos/sellers/approving");
          }
        } else setChecked(true);
      }
    }
  }, [dbUser, seller, sellerLoading, router, sellerAllowed, routeIfNot]);

  return { checkedSeller: checked };
};