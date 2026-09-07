import { connectDB } from '@/utils/connectDB';
import { Product } from '@/utils/models/productSchema';

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export type ProductPreview = {
  name: string;
  description: string;
  price: number;
  image: string | undefined;
};

// generateMetadata() on the detail page needs name/description/price/image
// for the Open Graph tags, not the full product with its seller populated
// that GET /api/products/[id] builds. A malformed (or missing) id returns
// null rather than blowing up with a CastError - the page falls back to the
// layout's generic metadata, not to a 500.
export async function getProductForMetadata(
  id: string
): Promise<ProductPreview | null> {
  if (!OBJECT_ID_RE.test(id)) return null;

  await connectDB();
  const product = await Product.findById(id)
    .select('name description price images')
    .lean();
  if (!product) return null;

  return {
    name: product.name,
    description: product.description,
    price: product.price,
    image: product.images?.[0],
  };
}
