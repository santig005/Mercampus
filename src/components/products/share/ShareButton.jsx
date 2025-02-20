"use client";
import { TbShare2, TbBrandWhatsapp, TbLink } from "react-icons/tb";
import { useState } from "react";

export default function ShareButton({ data, type }) {
  const [showModal, setShowModal] = useState(false); // Estado para controlar el modal

  if (!data) return null;
  const generateUrl = () => {
    if (type === "product") {
      return `${window.location.origin}/antojos/${data._id}?source=share`;
    } else if (type === "seller") {
      return `${window.location.origin}/antojos/sellers/${data._id}?source=share`;
    }
    return "";
  };

  const url = generateUrl();

  const getText = () => {
    if (type === "product") {
      return `¡Mira este producto en Mercampus! \n${data.name} de ${data?.sellerId?.businessName}\n${url}`;
    } else if (type === "seller") {
      return `¡Mira este vendedor en Mercampus! \n${data.businessName}\n${url}`;
    }
    return "";
  };

  const shareText = getText();
  // if (!product) return null;

  // const productUrl = `${window.location.origin}/antojos/${product._id}`;
  // const shareText = `¡Mira este producto en Mercampus! \n${product.name} de ${product?.sellerId?.businessName}\n${productUrl}`;

  // Función para compartir por WhatsApp
  const shareOnWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, "_blank");
  };

  // Función para copiar el enlace al portapapeles
  const copyLink = () => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        alert("¡Enlace copiado al portapapeles!"); // Puedes reemplazar esto con un toast o notificación
      })
      .catch((error) => {
        console.error("Error al copiar el enlace:", error);
      });
  };

  return (
    <>
      {/* Botón para abrir el modal */}
      <button
        className="btn btn-secondary w-full mt-2"
        onClick={() => setShowModal(true)}
      >
        Recomendar a un amigo <TbShare2 className="icon" />
      </button>
      <dialog
        id="my_modal_1"
        className={`modal px-6 ${showModal ? "modal-open" : ""}`}
      >
        <div className="modal-box px-6 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Compartir producto</h2>

          <button
            className="btn btn-primary w-full mb-2"
            onClick={shareOnWhatsApp}
          >
            <TbBrandWhatsapp className="icon" /> Compartir por WhatsApp
          </button>

          <button className="btn btn-secondary w-full" onClick={copyLink}>
            <TbLink className="icon" /> Copiar enlace
          </button>

          <button
            className="btn btn-ghost w-full mt-4"
            onClick={() => setShowModal(false)}
          >
            Cerrar
          </button>
        </div>
      </dialog>
    </>
  );
}
