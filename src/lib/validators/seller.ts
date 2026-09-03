import { z } from 'zod';

import { universities } from '@/utils/resources/universities';

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
  phoneNumber: z
    .number()
    .int('El teléfono debe ser numérico')
    .positive('El teléfono debe ser numérico'),
  university: z.enum(universities as [string, ...string[]]).optional(),
};

export const createSellerSchema = z.object(sellerFields);
export const updateSellerSchema = z.object(sellerFields).partial();
