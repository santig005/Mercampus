import { priceFormat } from '@/utils/utilFn';
import type { ProductPreview } from '@/server/products/getProductForMetadata';
import type { SellerPreview } from '@/server/sellers/getSellerForMetadata';

export const SITE_NAME = 'Mercampus';

// T-74: the canonical public origin, shared by the root layout's
// `metadataBase` and by the sitemap, so the two can't drift apart.
//
// Deliberately a constant and not `NEXT_PUBLIC_URL`: that variable is the
// client's API base and the test harnesses set it to http://localhost:<port>
// (scripts/e2e.mjs, scripts/lighthouse.mjs). A sitemap is required to list
// URLs on its own host, so picking it up from there risks publishing a
// sitemap full of localhost links the day it is set wrong - worse than
// having no sitemap at all. If the domain changes, it changes here.
export const SITE_URL = 'https://mercampus.vercel.app';

// T-76: the root layout's title config, kept here next to the builders that
// depend on it rather than inline in layout.jsx, so the `%s` can be asserted
// in a unit test (importing layout.jsx pulls in Clerk, next/font and the
// global CSS).
//
// It used to read `template: 'Mercampus'`. A template needs a `%s` to
// interpolate the child page's title into it; without one Next.js renders the
// literal string, so any page setting a plain `title: '...'` silently came
// out as just 'Mercampus'. Every page and layout under src/app was audited
// before changing this: nothing was relying on the old behaviour, because
// nothing sets a plain title - the only three pages with metadata (product
// and seller detail) go through the builders below, which used
// `title.absolute` to step around this exact bug. Now they don't have to.
export const titleMetadata = {
  template: `%s · ${SITE_NAME}`,
  default: SITE_NAME,
};

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
// vendedor.
//
// T-76: `title` es el nombre a secas y el sufijo ` · Mercampus` lo pone el
// template del layout raiz, ahora que ese template interpola de verdad. Antes
// era un `title.absolute` con el sufijo escrito a mano, justamente para
// saltarse el template roto. El titulo renderizado es el mismo; openGraph y
// twitter si llevan el string completo, porque a esos Next.js no les aplica
// el template.
export function buildProductMetadata(product: ProductPreview) {
  const title = `${product.name} · ${SITE_NAME}`;
  const description =
    plainTextDescription(product.description) ??
    `${priceFormat(product.price)} en ${SITE_NAME}.`;
  const images = product.image ? [{ url: product.image }] : undefined;

  return {
    title: product.name,
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
    title: seller.businessName,
    description,
    openGraph: { title, description, images, type: 'website' as const },
    twitter: { card: 'summary_large_image' as const, title, description, images },
  };
}
