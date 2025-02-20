"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSeller } from "@/context/SellerContext";

const SellerApprovalStatus = () => {
  const router = useRouter();
  const { seller, loading: sellerLoading } = useSeller();

  // Si ya está aprobado o si la carga del estado de vendedor ya ha terminado, redirigir.
  useEffect(() => {
    if (!sellerLoading) {
      if (seller && seller.approved) {
        router.push("/antojos/sellers/schedules");
      }
    }
  }, [seller, sellerLoading, router]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#F2F2F2] p-8">
      <div className="bg-[#FF7622] rounded-lg p-6 text-center">
        <h1 className="text-3xl font-bold mb-4">
          Tu estado de vendedor está en proceso de aprobación
        </h1>
        <p className="text-lg mb-4">
          Por favor, espera mientras revisamos la información de tu negocio.
          Entra más tarde.
        </p>
        <p className="text-sm text-gray-700">
          Si tienes alguna pregunta, puedes contactarnos directamente.
        </p>
      </div>
    </div>
  );
};

export default SellerApprovalStatus;
