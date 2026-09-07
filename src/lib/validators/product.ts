import { z } from 'zod';

import { antojosCategories } from '@/utils/resources/categories';
import { marketplaceCategories } from '@/utils/resources/marketplaceCategories';

const SECTIONS = ['antojos', 'marketplace'] as const;

const categoriesFor = (section: (typeof SECTIONS)[number]) =>
  section === 'marketplace' ? marketplaceCategories : antojosCategories;

// By default Zod drops keys that are not declared, which is exactly what is
// needed here: `new Product(body)` accepted any field from the client,
// sellerId included. sellerId is deliberately not declared - the server sets
// it from the session.
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

// The category/section coherence is validated by the Mongoose schema too. It
// is repeated here to return a 400 naming the field instead of a 500 on save;
// both read the same lists, so they cannot drift apart.
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

// An edit may carry only some of the fields, but if category and section do
// arrive they still have to be coherent.
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

// --- Sorting ------------------------------------------------------------------
//
// 'default' is the listing's historical order (availability desc, createdAt
// desc, _id as the tie-breaker) - T-23 made it deterministic, replacing the
// random shuffle that was there before. T-70 adds 'newest' and both price
// directions on top of the same cursor-pagination machinery, without touching
// the default.
export const SORT_OPTIONS = ['default', 'newest', 'price_asc', 'price_desc'] as const;
export type ProductSort = (typeof SORT_OPTIONS)[number];

const objectIdRegex = /^[a-f\d]{24}$/i;

// --- Cursor pagination --------------------------------------------------------
//
// The cursor stores the fields of the previous page's last product, in the
// same order the active sort uses, plus the sort itself: that way a cursor
// generated for 'price_asc' cannot be reused by mistake with 'newest' (the
// shape does not match and decodeProductCursor rejects it). Encoded as
// base64url so it travels in the URL without needing escapes.
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

// z.NEVER + ctx.addIssue rather than throwing: an invalid cursor is malformed
// input, not an exception - this way safeParse reports it like any other
// invalid field, instead of needing a separate try/catch in the route.
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
    // product and category end up in a $regex, so their length is capped.
    product: z.string().max(100).default(''),
    category: z.string().max(60).default(''),
    university: z.string().max(120).default(''),
    // A malformed sellerId reached Mongo and blew up with a CastError - a
    // 500 caused by a mistyped query parameter.
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
  // A cursor encodes its own sort (see above). If it does not match the
  // request's `sort`, "load more" would mix two different orders halfway down
  // the listing - easier to reject it here than to let it produce repeated or
  // skipped results in the client.
  .superRefine((data, ctx) => {
    if (data.cursor && data.cursor.sort !== data.sort) {
      ctx.addIssue({
        code: 'custom',
        path: ['cursor'],
        message: 'el cursor no coincide con el sort pedido',
      });
    }
  });
