import { z } from 'zod';

import { isNationalPhone, toNationalPhone } from '@/lib/phone';
import { universities } from '@/utils/resources/universities';

// The form sends the phone as a string - sometimes already formatted, like
// "(300) 123-4567" - while Mongoose stores it as a Number. Asking for a plain
// `z.number()` made seller sign-up answer 400 every time. It is normalised at
// the edge: keep the digits, drop the +57 country code, and validate before
// converting, so Mongoose always receives a 10-digit national number.
const phoneNumber = z
  .union([z.string(), z.number()])
  .transform(toNationalPhone)
  .refine(isNationalPhone, 'El teléfono debe tener 10 dígitos')
  .transform(Number);

// userId, clerkId and approved are NOT declared: the server sets them.
// `new Seller(body)` used to let the client send approved: true and
// self-approve.
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

// `paused` (T-71) is an update-only field: a seller that doesn't exist yet has
// nothing to hide from the listings, and leaving it out of the create schema
// keeps the sign-up payload as narrow as it was. The ownership check for
// writing it is the one PUT /api/sellers/[id] already runs (verifySellerId),
// the same one every other field here goes through.
export const updateSellerSchema = z
  .object({ ...sellerFields, paused: z.boolean() })
  .partial();
