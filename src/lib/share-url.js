// Building the URL ShareButton hands out for a product or a seller.
//
// Lives outside the component, in a file with no JSX, for the same reason as
// src/lib/card-variant.js: vitest's config runs with environment: 'node' and
// no DOM, and importing a real .jsx from a test blows up Vite's import
// analysis ("contains invalid JS syntax") instead of transforming it. A
// module with no JSX doesn't hit that, so this stays testable without
// rendering the component.

import { localizedHref, routing } from '@/i18n/routing';

// T-132: every product document carries its own `section` - the Mongoose
// schema declares it `required: true` with `default: 'antojos'`, and both
// GET /api/products and GET /api/products/:id return the full lean document
// (no `.select()` trimming fields), so `data.section` is always present in
// practice at every call site (ProductPage, ProductModal). The `|| 'antojos'`
// below is defensive, not a guess at what's missing: if it were ever absent,
// 'antojos' matches ProductPage's own default section prop for a product
// opened with no explicit section.
//
// `locale` defaults to the app's default locale (Spanish, no prefix) so
// every existing call site and test that doesn't pass one keeps building the
// same bare URL as before.
export function buildShareUrl({ origin, type, data, locale = routing.defaultLocale }) {
  if (!data) return '';

  if (type === 'product') {
    const section = data.section || 'antojos';
    // T-81 (human decision, 2026-09-17): a shared link carries the sharer's
    // locale, now that the product detail zone is migrated -
    // /antojos/<id> and /marketplace/<id> are `dynamic` LOCALIZED_ROUTES
    // entries (src/i18n/routing.ts), so localizedHref prefixes this for a
    // non-default locale (e.g. /en/marketplace/<id>) and leaves it bare for
    // the default one, reusing the same rule every other internal link
    // follows instead of re-implementing it here.
    const path = localizedHref(`/${section}/${data._id}`, locale);
    return `${origin}${path}?source=share`;
  }

  if (type === 'seller') {
    // Not the T-132 bug: seller profiles live only under /antojos/sellers,
    // in both sections, so this is correct as a fixed path regardless of
    // which section the seller's products are shown in.
    //
    // Stays bare regardless of `locale`, on purpose: /antojos/sellers is a
    // later, unmigrated zone (see ROADMAP.md T-81's product detail entry and
    // T-132), so a prefixed seller link would 404 today.
    return `${origin}/antojos/sellers/${data._id}?source=share`;
  }

  return '';
}
