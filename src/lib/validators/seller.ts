import { z } from 'zod';

import { isNationalPhone, toNationalPhone } from '@/lib/phone';
import { universities } from '@/utils/resources/universities';

// El formulario manda el teléfono como string —a veces ya formateado, como
// "(300) 123-4567"— mientras que Mongoose lo guarda como Number. Pedir
// `z.number()` a secas hacía que el alta de vendedor respondiera 400 siempre.
// Se normaliza en el borde: se dejan los dígitos, se descarta el indicativo
// +57 y se valida antes de convertir, así que a Mongoose siempre le llega un
// número nacional de 10 dígitos.
const phoneNumber = z
  .union([z.string(), z.number()])
  .transform(toNationalPhone)
  .refine(isNationalPhone, 'El teléfono debe tener 10 dígitos')
  .transform(Number);

// userId, clerkId y approved NO se declaran: los pone el servidor. Antes
// `new Seller(body)` dejaba que el cliente mandara approved: true y se
// autoaprobara.
const sellerFields = {
  businessName: z.string().trim().min(1, 'El nombre del negocio es obligatorio').max(120),
  slogan: z.string().trim().max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  logo: z.string().url('El logo debe ser una URL').optional(),
  instagramUser: z.string().trim().max(60).optional(),
  availability: z.boolean().optional(),
  phoneNumber,
  university: z.enum(universities as [string, ...string[]]).optional(),
};

export const createSellerSchema = z.object(sellerFields);
export const updateSellerSchema = z.object(sellerFields).partial();
