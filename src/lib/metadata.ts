import { priceFormat } from '@/utils/utilFn';
import type { ProductPreview } from '@/server/products/getProductForMetadata';
import type { SellerPreview } from '@/server/sellers/getSellerForMetadata';

const SITE_NAME = 'Mercampus';

// Las descripciones a veces quedan guardadas como un string JSON (ver
// parseIfJSON en utilFn.js, que las mismas pantallas ya usan para
// mostrarlas). Ahi puede devolver un objeto si el JSON.parse tiene exito -
// una meta description tiene que ser texto plano si o si, asi que un
// resultado que no sea string se descarta en vez de mostrarlo roto.
function plainTextDescription(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
}

// T-69: un link compartido (WhatsApp, Instagram) hoy cae en la metadata
// generica de layout.jsx - mismo titulo e imagen para cualquier producto o
// vendedor. title.absolute (no solo `title`) porque el template del layout
// raiz es 'Mercampus' sin un %s para interpolar: con un `title` comun,
// Next.js aplica ese template y el nombre del producto desaparece.
export function buildProductMetadata(product: ProductPreview) {
  const title = `${product.name} · ${SITE_NAME}`;
  const description =
    plainTextDescription(product.description) ??
    `${priceFormat(product.price)} en ${SITE_NAME}.`;
  const images = product.image ? [{ url: product.image }] : undefined;

  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, images, type: 'website' as const },
    twitter: { card: 'summary_large_image' as const, title, description, images },
  };
}

export function buildSellerMetadata(seller: SellerPreview) {
  const title = `${seller.businessName} · ${SITE_NAME}`;
  const description =
    plainTextDescription(seller.description) ??
    seller.slogan ??
    `Conócelo en ${SITE_NAME}.`;
  const images = seller.logo ? [{ url: seller.logo }] : undefined;

  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, images, type: 'website' as const },
    twitter: { card: 'summary_large_image' as const, title, description, images },
  };
}
