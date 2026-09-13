import { cache } from 'react';

import { connectDB } from '@/utils/connectDB';
import { Seller } from '@/utils/models/sellerSchema2';

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export type SellerPreview = {
  businessName: string;
  description: string | undefined;
  slogan: string | undefined;
  logo: string;
};

// Same rule as getProductForMetadata: only the fields the profile page's
// Open Graph tags need, and null (not an exception) for a malformed or
// missing id.
async function readSellerForMetadata(
  id: string
): Promise<SellerPreview | null> {
  if (!OBJECT_ID_RE.test(id)) return null;

  await connectDB();
  const seller = await Seller.findById(id)
    .select('businessName description slogan logo')
    .lean();
  if (!seller) return null;

  return {
    businessName: seller.businessName,
    description: seller.description ?? undefined,
    slogan: seller.slogan ?? undefined,
    logo: seller.logo,
  };
}

// `cache` is only exported by React's react-server build - the one Next
// resolves for Server Components. Vitest resolves the regular build, where the
// import lands as undefined, so fall back to calling straight through: the
// dedupe is a per-request optimisation, never behaviour a test asserts on.
type Reader<T> = (id: string) => Promise<T | null>;
const perRequest = <T,>(read: Reader<T>): Reader<T> =>
  typeof cache === 'function' ? cache(read) : read;

// T-90: same as getProductForMetadata - the profile page resolves the seller
// to decide whether to 404, and generateMetadata resolves it again.
export const getSellerForMetadata = perRequest<SellerPreview>(readSellerForMetadata);
