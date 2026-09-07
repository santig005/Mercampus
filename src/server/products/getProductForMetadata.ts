import { connectDB } from '@/utils/connectDB';
import { Product } from '@/utils/models/productSchema';

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

export type ProductPreview = {
  name: string;
  description: string;
  price: number;
  image: string | undefined;
};

// generateMetadata() en la pagina de detalle necesita nombre/descripcion/
// precio/imagen para el Open Graph, no el producto completo con el vendedor
// poblado que arma GET /api/products/[id]. Un id con formato invalido
// (o inexistente) devuelve null en vez de reventar con un CastError - la
// pagina cae al metadata generico del layout, no a un 500.
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
