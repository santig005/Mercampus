// The single definition of "this seller is visible to the public".
//
// T-74: it used to be written out by hand in GET /api/products and
// GET /api/sellers. The sitemap would have been a third copy, and a sitemap
// that disagrees with the listing is worse than no sitemap - it would keep
// advertising a seller who paused their store (T-71) or lost approval.
//
// A function, not a shared object: each caller spreads it into a query it then
// extends (the product listing adds a university filter), and handing out the
// same literal invites someone to mutate it.
//
// `paused: { $ne: true }` and never `paused: false` - sellers created before
// T-71 have no `paused` field at all and an equality filter doesn't match a
// missing one. See the note in api/products/route.js.
export function publicSellerFilter() {
  return { approved: true, paused: { $ne: true } };
}
