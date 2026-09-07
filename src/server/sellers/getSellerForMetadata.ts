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
export async function getSellerForMetadata(
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
