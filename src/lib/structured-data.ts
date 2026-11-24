import { SITE_NAME, SITE_URL, plainTextDescription } from '@/lib/metadata';
import { productPath } from '@/lib/sitemap';
import type { ProductPreview } from '@/server/products/getProductForMetadata';

// T-152c: schema.org JSON-LD. Pure builders, so the emitted JSON is asserted
// in a unit test the way src/lib/metadata.ts's builders are (T-151 asks for
// exactly that), and the page only serializes what they return.

// The profile the landing's final call to action already links to.
export const INSTAGRAM_URL = 'https://www.instagram.com/mercampus/';

// /images/logo.png (500x500) is the logo the landing's topbar renders. It was
// chosen over /android-chrome-512x512.png, which the root layout declared but
// never existed (T-162 removed that declaration).
export const ORGANIZATION_LOGO_PATH = '/images/logo.png';

// Emitted in the root layout's <head> (server-rendered, every page): who is
// behind the site. This is what lets a search result or a link preview name
// the organization instead of just showing a bare URL.
export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}${ORGANIZATION_LOGO_PATH}`,
    sameAs: [INSTAGRAM_URL],
  };
}

// T-151: product name and description are database values a seller typed,
// not a literal here, so a value like `</script><script>...` must not be
// able to close the <script> tag early. Escaped beyond just '<':
// - '>' and '&' so a value can't close an HTML comment (`-->`) or spoof an
//   entity once it's inside markup that re-parses this output.
// - U+2028/U+2029 (LINE/PARAGRAPH SEPARATOR) are valid in JSON strings but
//   terminate a JavaScript string literal in engines that predate ES2019,
//   which would also truncate the script. JSON.parse decodes every one of
//   these \u escapes back to the original character, so this never changes
//   what the data round-trips to.
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// Emitted on every product detail page (/antojos/<id>, /marketplace/<id>):
// what the page is selling. `offers.availability` is deliberately omitted -
// see the comment below, it is not a missing field, it is a field this data
// model cannot answer correctly yet.
//
// Found while wiring this up (T-151): unlike buildOrganizationJsonLd(),
// this one is rendered from the page component, not the root layout's
// <head> - and src/app/layout.jsx wraps every page body in <ClerkLoaded>,
// which renders nothing server-side (ROADMAP.md T-163, already open,
// `opus`/human-required, not fixed here - it is cross-cutting and outside
// this task's scope). So this markup is correct and unit-tested, and
// becomes visible in the hydrated DOM once Clerk's script loads in a
// browser (tests/e2e/product-jsonld.spec.js checks exactly that), but a
// crawler or validator that does not run JavaScript sees none of it until
// T-163 ships - the same bug T-163's entry documents for Organization
// before it moved into <head>, measured there against Google's own Rich
// Results Test.
export function buildProductJsonLd(id: string, product: ProductPreview) {
  const path = productPath({ id, section: product.section });
  const url = `${SITE_URL}${path}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: plainTextDescription(product.description) ?? product.description,
    // Only emitted when the product actually has one - never a placeholder.
    ...(product.images.length > 0 ? { image: product.images } : {}),
    url,
    offers: {
      '@type': 'Offer',
      url,
      price: product.price,
      priceCurrency: 'COP',
      // No `availability` here. The page's AvailabilityBadge renders one of
      // four states (available/off/closed/no-schedule) built by
      // productAvailability() in src/lib/store-availability.ts, and three of
      // those four answer "is the seller's store open right now" - a value
      // that changes by the minute with the Bogotá clock, not "is this item
      // in stock". Schema.org's InStock/OutOfStock means the latter, and
      // T-145 (the actual sold-out flag) does not exist yet. Mapping "closed
      // right now, reopens Tuesday" to OutOfStock would tell Google a
      // perfectly sellable product is sold out - the exact manual-action risk
      // this entry's "Careful" note warns about - so the field is left out
      // rather than guessed at. Revisit once T-145 ships a real stock state.
    },
  };
}
