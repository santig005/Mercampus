// T-134: the seller register form used to build its submit payload by
// mutating the `sellerData` state object in place
// (`sellerData.description = JSON.stringify(sellerData.description)`), never
// through `setSellerData`. A failed submit left that mutation sitting in
// state, so a retry without retyping anything stringified the description a
// second time, and the Zod schema (`description` is a plain string, see
// src/lib/validators/seller.ts) saw whatever survived. Building a new object
// here, and never touching `sellerData`, is what makes a retry safe.
export const buildSellerRegisterPayload = sellerData => ({
  ...sellerData,
  logo: sellerData.images?.[0],
  description: JSON.stringify(sellerData.description),
});
