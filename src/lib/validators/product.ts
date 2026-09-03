import { z } from 'zod';

import { antojosCategories } from '@/utils/resources/categories';
import { marketplaceCategories } from '@/utils/resources/marketplaceCategories';

const SECTIONS = ['antojos', 'marketplace'] as const;

const categoriesFor = (section: (typeof SECTIONS)[number]) =>
  section === 'marketplace' ? marketplaceCategories : antojosCategories;

// Por defecto Zod descarta las claves que no estan declaradas, que es justo lo
// que hace falta: `new Product(body)` aceptaba cualquier campo del cliente,
// sellerId incluido. Aqui sellerId no se declara a proposito — lo pone el
// servidor a partir de la sesion.
const productFields = {
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  price: z.number().int('El precio debe ser un entero').nonnegative(),
  description: z.string().trim().min(1, 'La descripción es obligatoria').max(2000),
  images: z.array(z.string().url('Cada imagen debe ser una URL')).min(1),
  section: z.enum(SECTIONS).default('antojos'),
  category: z.array(z.string()).min(1, 'Indica al menos una categoría'),
  availability: z.boolean().optional(),
  stock: z.boolean().optional(),
};

// La coherencia categoria/seccion tambien la valida el schema de Mongoose. Aqui
// se repite para devolver 400 con el campo, en vez de un 500 al guardar; ambas
// leen las mismas listas, asi que no pueden desincronizarse.
const checkCategoriesMatchSection = (
  data: { section: (typeof SECTIONS)[number]; category: string[] },
  ctx: z.RefinementCtx
) => {
  const valid = categoriesFor(data.section);
  const invalid = data.category.filter(category => !valid.includes(category));

  if (invalid.length > 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['category'],
      message: `No pertenecen a la sección ${data.section}: ${invalid.join(', ')}`,
    });
  }
};

export const createProductSchema = z
  .object(productFields)
  .superRefine(checkCategoriesMatchSection);

// En una edicion pueden venir solo algunos campos, pero si vienen categoria y
// seccion tienen que seguir siendo coherentes.
export const updateProductSchema = z
  .object(productFields)
  .partial()
  .superRefine((data, ctx) => {
    if (data.category && data.section) {
      checkCategoriesMatchSection(
        { section: data.section, category: data.category },
        ctx
      );
    }
  });

export const productQuerySchema = z.object({
  section: z.enum(SECTIONS).default('antojos'),
  // product y category acaban en un $regex, asi que se acota la longitud.
  product: z.string().max(100).default(''),
  category: z.string().max(60).default(''),
  university: z.string().max(120).default(''),
  // Un sellerId con formato invalido llegaba a Mongo y reventaba con CastError,
  // o sea un 500 por un parametro mal escrito.
  sellerId: z
    .union([
      z.string().regex(/^[a-f\d]{24}$/i, 'sellerId debe ser un ObjectId'),
      z.literal(''),
    ])
    .default(''),
});
