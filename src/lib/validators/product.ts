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

// --- Ordenamiento -------------------------------------------------------------
//
// 'default' es el orden historico del listado (availability desc, createdAt
// desc, _id como desempate) - T-23 lo hizo determinista, reemplazando el
// shuffle aleatorio que habia antes. T-70 suma 'newest' y los dos sentidos de
// precio sobre la misma maquina de paginacion por cursor, sin tocar el
// default.
export const SORT_OPTIONS = ['default', 'newest', 'price_asc', 'price_desc'] as const;
export type ProductSort = (typeof SORT_OPTIONS)[number];

const objectIdRegex = /^[a-f\d]{24}$/i;

// --- Paginacion por cursor ---------------------------------------------------
//
// El cursor guarda los campos del ultimo producto de la pagina anterior, en
// el mismo orden que usa el sort activo, mas el propio sort: asi un cursor
// generado para 'price_asc' no se puede reutilizar por error con 'newest'
// (el shape no matchea y decodeProductCursor lo rechaza). Codificado en
// base64url para que viaje en la URL sin necesitar escapes.
const cursorPayloadSchema = z.discriminatedUnion('sort', [
  z.object({
    sort: z.literal('default'),
    availability: z.boolean(),
    createdAt: z.string().datetime(),
    id: z.string().regex(objectIdRegex),
  }),
  z.object({
    sort: z.literal('newest'),
    createdAt: z.string().datetime(),
    id: z.string().regex(objectIdRegex),
  }),
  z.object({
    sort: z.literal('price_asc'),
    price: z.number(),
    id: z.string().regex(objectIdRegex),
  }),
  z.object({
    sort: z.literal('price_desc'),
    price: z.number(),
    id: z.string().regex(objectIdRegex),
  }),
]);

export type ProductCursor = z.infer<typeof cursorPayloadSchema>;

export function encodeProductCursor(value: ProductCursor): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

// z.NEVER + ctx.addIssue en vez de lanzar: un cursor invalido es un dato de
// entrada mal formado, no una excepcion — con esto safeParse lo reporta igual
// que cualquier otro campo invalido, en vez de necesitar un try/catch aparte
// en la ruta.
const decodeProductCursor = (
  raw: string,
  ctx: z.RefinementCtx
): ProductCursor | null => {
  if (!raw) return null;
  try {
    return cursorPayloadSchema.parse(
      JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
    );
  } catch {
    ctx.addIssue({ code: 'custom', message: 'cursor inválido' });
    return z.NEVER;
  }
};

export const productQuerySchema = z
  .object({
    section: z.enum(SECTIONS).default('antojos'),
    // product y category acaban en un $regex, asi que se acota la longitud.
    product: z.string().max(100).default(''),
    category: z.string().max(60).default(''),
    university: z.string().max(120).default(''),
    // Un sellerId con formato invalido llegaba a Mongo y reventaba con
    // CastError, o sea un 500 por un parametro mal escrito.
    sellerId: z
      .union([
        z.string().regex(/^[a-f\d]{24}$/i, 'sellerId debe ser un ObjectId'),
        z.literal(''),
      ])
      .default(''),
    sort: z.enum(SORT_OPTIONS).default('default'),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    cursor: z.string().default('').transform(decodeProductCursor),
  })
  // Un cursor codifica su propio sort (ver arriba). Si no coincide con el
  // `sort` del pedido, "cargar mas" mezclaria dos ordenes distintos a mitad
  // de listado - mas facil rechazarlo aca que dejar que produzca resultados
  // repetidos o salteados en el cliente.
  .superRefine((data, ctx) => {
    if (data.cursor && data.cursor.sort !== data.sort) {
      ctx.addIssue({
        code: 'custom',
        path: ['cursor'],
        message: 'el cursor no coincide con el sort pedido',
      });
    }
  });
