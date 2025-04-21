"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSeller } from "@/context/SellerContext";
import { useCheckSeller } from "@/context/SellerContext";
import Loading from "@/components/general/Loading";

const SellerApprovalStatus = () => {
  const { checkedSeller } = useCheckSeller("sellerNotApproved", "/antojos/sellers/schedules");
  if(!checkedSeller){return <Loading />}

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
  )
};

export default SellerApprovalStatus;
