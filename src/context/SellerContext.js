// SellerContext.js
"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SellerContext = createContext(null);

// user/seller llegan ya resueltos por el servidor (getSellerContextData en
// src/utils/lib/auth.ts, llamada desde el layout raiz) en vez de pedirse por
// fetch al montar. Antes SellerContext le pegaba a
// GET /api/users/user-with-seller/[email] desde el cliente: esa ruta no
// tenia autenticacion y era un oraculo de enumeracion de cuentas (T-12d).
// setSeller/setDbUser se conservan porque varias pantallas los usan para
// actualizacion optimista tras un PUT, sin volver a pedir los datos.
export const SellerProvider = ({ children, initialUser, initialSeller }) => {
  const [seller, setSeller] = useState(initialSeller);
  const [dbUser, setDbUser] = useState(initialUser);

  return (
    <SellerContext.Provider
      value={{ seller, setSeller, loading: false, dbUser, setDbUser }}
    >
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
          if (seller!="None") {
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
