"use client";

import { useEffect, useState } from "react";
import {
  TbChevronLeft,
  TbBrandWhatsapp,
  TbBrandInstagram,
} from "react-icons/tb";
import { useRouter } from "next/navigation";
import Carousel from "@/components/Carousel";
import TableSchema from "@/components/seller/index/table/TableSchema";
import AvailabilityBadge from "@/components/availability/AvailabilityBadge";
import SellerModal from "@/components/seller/index/SellerModal";
import { sendGAEvent } from "@next/third-parties/google";

export default function SellerPage({ id }) {
  const [seller, setSeller] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sellerModalId, setSellerModalId] = useState(null);

  const router = useRouter();

  useEffect(() => {
    if (!id) return;

    async function fetchSeller() {
      setLoading(true);
      try {
        const response = await fetch(`/api/sellers/${id}`);
        const data = await response.json();

        if (data.error) {
          console.error("Error fetching seller:", data.error);
          return;
        }

        setSeller(data.seller);
        setSchedules(data.seller.schedules);
        setImages([data.seller.logo]);
      } catch (error) {
        console.error("Error fetching seller:", error);
      }
      setLoading(false);
    }
    fetchSeller();
  }, [id]);

  if (!seller) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="flex justify-center">
          <span className="loading loading-infinity loading-lg bg-primary-orange"></span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {loading ? (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="flex justify-center">
            <span className="loading loading-infinity loading-lg bg-primary-orange"></span>
          </div>
        </div>
      ) : (
        <dialog id="seller_modal" className="modal modal-top modal-open h-screen">
          {seller ? (
            <>
              <div className="modal-box w-full h-full rounded-none bg-primary p-0 relative">
                <div className="sticky top-0 left-0">
                  <div className="absolute w-full z-10">
                    <div className="modal-action m-0 justify-between p-2">
                      <button
                        className="btn btn-circle"
                        onClick={() => {
                          router.push("/antojos");
                        }}
                      >
                        <TbChevronLeft className="icon" />
                      </button>
                    </div>
                  </div>
                  <SellerModal seller={sellerModalId} set={setSellerModalId} />
                  {seller && seller.logo && (
                    <Carousel
                      key={seller._id}
                      images={images}
                      _id={seller._id}
                    />
                  )}
                </div>

                <div className="relative h-auto bg-inherit">
                  <div className="bg-primary rounded-t-3xl w-full absolute -top-8 flex flex-col gap-2 pt-6">
                    <div className="flex flex-col pb-32 gap-2">
                      <div className="flex flex-col px-6 gap-1">
                        <h2 className="text-lg font-semibold break-words">
                          {seller.businessName}
                        </h2>
                        <AvailabilityBadge availability={seller.availability} />
                      </div>
                      {seller.slogan && (
                        <p className="text-[14px] px-6 italic text-secondary">
                          &quot;
                          <span className="text-primary bg-primary/10 p-1 rounded-md mx-1 leading-8">
                            {seller.slogan}
                          </span>
                          &quot;
                        </p>
                      )}
                      <p className="text-[14px] text-secondary px-6">
                        {seller.description}
                      </p>
                      <button
                        className="btn max-w-min flex-nowrap mx-6"
                        onClick={() => {
                          const newSeller = {
                            ...seller,
                            schedules: seller.schedules,
                          };
                          setSellerModalId(newSeller);
                          document.getElementById("seller_modal").showModal();
                        }}
                      >
                        <div className="rounded-full size-10 overflow-hidden">
                          <img
                            className="img-full"
                            src={seller.logo}
                            alt={"Imagen del vendedor " + seller.businessName}
                          />
                        </div>
                        <p className="my-card-subtitle !text-[14px] text-nowrap">
                          {seller.businessName}
                        </p>
                      </button>
                      <div className="">
                        <h2 className="card-title px-6">Horario</h2>
                        {schedules && <TableSchema schedules={schedules} />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-200 rounded-t-3xl p-2 fixed bottom-0 w-full h-32 px-6">
                <div className="flex flex-col h-full justify-center">
                  <div className="join w-full">
                    <a
                      href={`https://www.instagram.com/_u/${seller.instagramUser}`}
                      className="btn btn-primary border-none join-item w-1/2"
                      target="_blank"
                      referrerPolicy="no-referrer"
                      onClick={() => {
                        sendGAEvent("event", "click_instagram", {
                          action: "Clicked Instagram Link",
                          seller_name: seller.businessName,
                          seller_instagramUser: seller.instagramUser,
                          seller_id: seller._id,
                        });
                      }}
                    >
                      <TbBrandInstagram className="icon" /> Instagram
                    </a>
                    <a
                      href={`https://wa.me/+57${seller.phoneNumber}?text=Hola ${seller.businessName},%20te%20vi%20en%20Mercampus%20`}
                      className="btn btn-primary join-item w-1/2"
                      target="_blank"
                      referrerPolicy="no-referrer"
                      onClick={() => {
                        sendGAEvent("event", "click_whatsapp_seller", {
                          action: "Clicked WhatsApp Link",
                          seller_name: seller.businessName,
                          seller_id: seller._id,
                        });
                      }}
                    >
                      <TbBrandWhatsapp className="icon" /> WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className=""></div>
          )}
        </dialog>
      )}
    </div>
  );
}