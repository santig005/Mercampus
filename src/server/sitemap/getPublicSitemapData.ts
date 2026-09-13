import { publicSellerFilter } from '@/lib/public-visibility';
import type { SitemapProduct, SitemapSeller } from '@/lib/sitemap';
import { connectDB } from '@/utils/connectDB';
import { Product } from '@/utils/models/productSchema';
import { Seller } from '@/utils/models/sellerSchema2';

// T-74. Exactly the sellers the public listing shows, and their products.
// Reads Mongo directly - no fetch to our own API, per CLAUDE.md.
export async function getPublicSitemapData(): Promise<{
  sellers: SitemapSeller[];
  products: SitemapProduct[];
}> {
  await connectDB();

  const sellers = await Seller.find(publicSellerFilter())
    .select('_id updatedAt')
    .lean();

  // Products are scoped to those sellers, not fetched wholesale: a product of
  // an unapproved or paused seller is not reachable from any public listing,
  // and advertising it in the sitemap would send crawlers to a page whose
  // catalogue is deliberately hidden.
  const sellerIds = sellers.map(seller => seller._id);
  const products = await Product.find({ sellerId: { $in: sellerIds } })
    .select('_id section updatedAt')
    .lean();

  return {
    sellers: sellers.map(seller => ({
      id: seller._id.toString(),
      updatedAt: seller.updatedAt,
    })),
    products: products.map(product => ({
      id: product._id.toString(),
      section: product.section,
      updatedAt: product.updatedAt,
    })),
  };
}
