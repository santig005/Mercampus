// Building the URL ShareButton hands out for a product or a seller.
//
// Lives outside the component, in a file with no JSX, for the same reason as
// src/lib/card-variant.js: vitest's config runs with environment: 'node' and
// no DOM, and importing a real .jsx from a test blows up Vite's import
// analysis ("contains invalid JS syntax") instead of transforming it. A
// module with no JSX doesn't hit that, so this stays testable without
// rendering the component.

// T-132: every product document carries its own `section` - the Mongoose
// schema declares it `required: true` with `default: 'antojos'`, and both
// GET /api/products and GET /api/products/:id return the full lean document
// (no `.select()` trimming fields), so `data.section` is always present in
// practice at every call site (ProductPage, ProductModal). The `|| 'antojos'`
// below is defensive, not a guess at what's missing: if it were ever absent,
// 'antojos' matches ProductPage's own default section prop for a product
// opened with no explicit section.
export function buildShareUrl({ origin, type, data }) {
  if (!data) return '';

  if (type === 'product') {
    const section = data.section || 'antojos';
    return `${origin}/${section}/${data._id}?source=share`;
  }

  if (type === 'seller') {
    // Not the T-132 bug: seller profiles live only under /antojos/sellers,
    // in both sections, so this is correct as a fixed path regardless of
    // which section the seller's products are shown in.
    return `${origin}/antojos/sellers/${data._id}?source=share`;
  }

  return '';
}
