import { cache } from 'react';

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
async function readProductForMetadata(
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

// `cache` is only exported by React's react-server build - the one Next
// resolves for Server Components. Vitest resolves the regular build, where the
// import lands as undefined, so fall back to calling straight through: the
// dedupe is a per-request optimisation, never behaviour a test asserts on.
type Reader<T> = (id: string) => Promise<T | null>;
const perRequest = <T,>(read: Reader<T>): Reader<T> =>
  typeof cache === 'function' ? cache(read) : read;

// T-90: both generateMetadata() and the page body resolve the product now -
// the page 404s when it is missing - so this is cached per request. Without
// it, one page view is two identical queries.
export const getProductForMetadata = perRequest<ProductPreview>(readProductForMetadata);
