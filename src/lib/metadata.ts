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

// T-162: the root layout's icons and share image, kept here so a test can
// check each file actually exists (importing layout.jsx pulls in Clerk,
// next/font and the global CSS).
//
// These used to point at /favicon-16x16.png, /favicon-32x32.png,
// /android-chrome-192x192.png, /android-chrome-512x512.png and
// /apple-touch-icon.png. None of them was ever added to public/ - all 404 in
// production (measured 2026-09-26) - and the 512 one was also the Open Graph
// image, so every shared link that was not a product or a seller previewed
// with a broken image. Only files that exist are declared now: the two
// 512x512 icons public/manifest.json already uses, and favicon.ico (which is
// a 512x512 PNG despite the extension; declared as what it is).
//
// icon512_rounded.png has transparent rounded corners - right for a browser
// tab. icon512_maskable.png is the full-bleed orange square - right where the
// platform applies its own mask (iOS home screen) and for a share preview,
// where transparent corners render as black or white.
export const SITE_ICONS = {
  icon: [
    { url: '/favicon.ico', sizes: '512x512', type: 'image/png' },
    { url: '/icon512_rounded.png', sizes: '512x512', type: 'image/png' },
  ],
  shortcut: '/favicon.ico',
  apple: '/icon512_maskable.png',
};

export const SITE_OG_IMAGE = {
  url: '/icon512_maskable.png',
  width: 512,
  height: 512,
  alt: 'Mercampus',
};

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

// Descriptions are sometimes stored as a JSON string (see parseIfJSON in
// utilFn.js, which those same screens already use to display them). There it
// can return an object when JSON.parse succeeds - a meta description has to
// be plain text, so a non-string result is discarded rather than rendered
// broken.
function plainTextDescription(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
}

// T-69: a shared link (WhatsApp, Instagram) used to fall back to layout.jsx's
// generic metadata - the same title and image for every product and seller.
//
// T-76: `title` is the bare name and the ` · Mercampus` suffix comes from the
// root layout's template, now that the template actually interpolates. It
// used to be a `title.absolute` with the suffix written by hand, precisely to
// step around the broken template. The rendered title is the same; openGraph
// and twitter do carry the full string, because Next.js does not apply the
// title template to those.
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
