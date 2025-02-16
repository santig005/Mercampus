'use client';
import { TbShare2 } from 'react-icons/tb';

export default function ShareButton({ product }) {
  if (!product) return null;
  console.log("el producto es ", product);

  const productUrl = `${window.location.origin}/antojos/${product._id}`;
  

  const shareText = `¡Mira este producto en Mercampus! \n${product.name} de ${product?.sellerId?.businessName}\n${productUrl}`;

  const shareOnWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareGeneral = () => {
    if (navigator.share) {
      navigator
        .share({
          title: product.name,
          text: shareText,
          url: productUrl,
        })
        .catch((error) => console.error('Error al compartir:', error));
    } else {
      shareOnWhatsApp();
    }
  };

  return (
    <button className='btn btn-secondary w-full mt-2' onClick={shareOnWhatsApp}>
      Recomendar a un amigo <TbShare2 className='icon' />
    </button>
  );
}
