"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSeller } from "@/context/SellerContext";
import { useCheckSeller } from "@/context/SellerContext";
import Loading from "@/components/general/Loading";
import { BsWhatsapp } from 'react-icons/bs';

const SellerApprovalStatus = () => {
  const { checkedSeller } = useCheckSeller("sellerNotApproved", "/antojos/sellers/schedules");
  const {seller} = useSeller();
  //const { checkedSeller, seller } = useCheckSeller("sellerNotApproved", "/antojos/sellers/schedules");

  if(!checkedSeller){return <Loading />}
  const whatsappUrl = `https://wa.me/573197139921?text=Holaa,%20soy%20el%20vendedor%20${seller?.businessName},%20me%20registré%20en%20Mercampus,%20podrías%20revisar%20mi%20solicitud%20para%20aprobarme?`;

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-base-200 p-8">
      {/* T-100 (F47) used `bg-primary`/`text-primary-content` here, which
          looked right in isolation but public/css/main.css:62 overrides
          `.bg-primary` to `bg-[#f8f8f8]` app-wide, in both themes - Layout.jsx
          has a comment explaining the same trap. That rendered this card as
          near-white with white text: illegible in light mode, worse than the
          bug it was fixing. `bg-primary-orange` is the class every other
          branded-orange surface in the app actually uses (Loading's spinner,
          ProfileChecklist's progress bar, Carousel's active dot) - none of
          them differ by theme either, so this card matches that existing
          convention instead of inventing a new one. `text-white` pairs with
          it for the same reason: there is no daisyUI content-token for a
          class that is not itself a daisyUI token. */}
      <div className="bg-primary-orange rounded-lg p-6 text-center">
      <h1 className="text-3xl font-bold mb-4 text-white">
          <span>Hola {seller?.businessName}</span>.
        </h1>
        <h1 className="text-3xl font-bold mb-4 text-white">
          Tu estado de vendedor está en proceso de aprobación
        </h1>
        <p className="text-lg mb-4 text-white">
          Por favor, espera mientras revisamos la información de tu negocio.
          Entra más tarde.
        </p>
        <p className="text-sm text-white mb-4">
        Para más agilidad, o si tienes alguna pregunta, puedes contactarnos directamente.
        </p>
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition-colors"
          >
            <BsWhatsapp className="mr-2" />
            Contactar/Pedir aprobación por WhatsApp
          </a>
      </div>
    </div>
  )
};

export default SellerApprovalStatus;
