"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSeller } from "@/context/SellerContext";
import { useCheckSeller } from "@/context/SellerContext";
import Loading from "@/components/general/Loading";
import { supportWhatsAppUrl } from "@/utils/resources/support";
import { BsWhatsapp } from 'react-icons/bs';

// T-81 (seller onboarding): moved from src/app/antojos/sellers/approving/
// (deleted). Client Component, so no `params`: src/app/[locale]/layout.jsx
// sets the request locale for the subtree. useCheckSeller localizes its own
// redirect, so an approved seller sent away from /en/... keeps English
// wherever the destination has a twin.
const SellerApprovalStatus = () => {
  const t = useTranslations("SellerApproving");
  const { checkedSeller } = useCheckSeller("sellerNotApproved", "/antojos/sellers/schedules");
  const {seller} = useSeller();
  //const { checkedSeller, seller } = useCheckSeller("sellerNotApproved", "/antojos/sellers/schedules");

  if(!checkedSeller){return <Loading />}
  // `?? ''`: useCheckSeller lets seller === "None" (a signed-in user with no
  // seller profile) through to this page - see ROADMAP.md T-134 - and an
  // undefined ICU argument is a formatting error, where the old JSX just
  // rendered "Hola .".
  const name = seller?.businessName ?? "";
  // The message is written in the seller's language: it is their words to
  // the Mercampus team. encodeURIComponent, not hand-written %20s - the
  // business name used to go into the URL raw, so an "&" in it cut the
  // message short.
  const whatsappUrl = supportWhatsAppUrl(t("whatsappMessage", { name }));

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
          <span>{t("greeting", { name })}</span>.
        </h1>
        <h1 className="text-3xl font-bold mb-4 text-white">
          {t("heading")}
        </h1>
        <p className="text-lg mb-4 text-white">
          {t("body")}
        </p>
        <p className="text-sm text-white mb-4">
        {t("contactHint")}
        </p>
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition-colors"
          >
            <BsWhatsapp className="mr-2" />
            {t("whatsappCta")}
          </a>
      </div>
    </div>
  )
};

export default SellerApprovalStatus;
