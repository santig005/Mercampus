'use client';
import { logger } from '@/lib/logger';
import { buildShareUrl } from '@/lib/share-url';
import { TbShare2, TbBrandWhatsapp, TbLink, TbLinkPlus } from 'react-icons/tb';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';

export default function ShareButton({ data, type }) {
  const [copied, setCopied] = useState(false);
  const [renderPage] = useAutoAnimate({
    duration: 150,
    easing: 'ease-in-out',
  });
  const locale = useLocale();
  const t = useTranslations('ShareButton');

  if (!data) return null;

  // T-81 (share link locale): a shared link carries the sharer's locale for
  // a product (localizedHref only prefixes once the product detail zone is
  // migrated, which it now is), but never for a seller - /antojos/sellers is
  // not migrated, so a prefixed seller link would 404. See src/lib/share-url.js.
  const url = buildShareUrl({
    origin: window.location.origin,
    type,
    data,
    locale,
  });

  const getText = () => {
    if (type === 'product') {
      return t('productMessage', {
        name: data.name,
        business: data?.sellerId?.businessName,
        url,
      });
    } else if (type === 'seller') {
      return t('sellerMessage', { business: data.businessName, url });
    }
    return '';
  };

  const shareText = getText();
  // if (!product) return null;

  // const productUrl = `${window.location.origin}/antojos/${product._id}`;
  // const shareText = `¡Mira este producto en Mercampus! \n${product.name} de ${product?.sellerId?.businessName}\n${productUrl}`;

  // Share via WhatsApp
  const shareOnWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Copy the link to the clipboard
  const copyLink = () => {
    setCopied(false);
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2500);
      })
      .catch((error) => {
        logger.error('Error al copiar el enlace:', error);
      });
  };

  return (
    <>
      {/* Botón para abrir el modal */}

      <dialog id={`my_modal_1_${type}`} className={`modal px-6 `}>
        <div className='modal-box px-6 rounded-lg modal-width'>
          <h2 className='text-lg font-semibold mb-4'>{t('title')}</h2>

          <button
            className='btn btn-primary w-full mb-2'
            onClick={shareOnWhatsApp}
          >
            <TbBrandWhatsapp className='icon' /> {t('whatsapp')}
          </button>

          <button
            ref={renderPage}
            className={`btn btn-secondary w-full transition-colors duration-150 ${
              copied && '!bg-green-600 !text-gray-200'
            }`}
            onClick={copyLink}
            disabled={copied}
          >
            {copied ? (
              <>
                <TbLinkPlus className='icon text-gray-200' /> {t('linkCopied')}
              </>
            ) : (
              <>
                <TbLink className='icon' /> {t('copyLink')}
              </>
            )}
            {/* <TbLink className='icon' /> Copiar enlace */}
          </button>

          {/* <button
            className='btn btn-ghost w-full mt-4'
            onClick={() => setShowModal(false)}
          >
            Cerrar
          </button> */}
        </div>
        <form method='dialog' className='modal-backdrop'>
          <button>{t('close')}</button>
        </form>
      </dialog>
    </>
  );
}
