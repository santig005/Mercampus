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

// T-83: how far into the future a seller may set `availabilityOverrideUntil`.
// Not a human-specified number - the ROADMAP entry only requires "bounded" -
// chosen as a business-day-length ceiling so a forgotten override can't drift
// into "permanently marked available", the exact failure mode the task warns
// about. Exported so the UI's preset duration buttons can't offer more than
// the API will accept.
export const MAX_AVAILABILITY_OVERRIDE_HOURS = 6;

// `null` clears the override; a string must be a real ISO instant no further
// ahead than the cap above. Deliberately NOT required to be in the future:
// `handleSubmit` in EditSellerForm resends the whole seller object, including
// whatever `availabilityOverrideUntil` it already had, so an expired one
// would otherwise turn every unrelated profile edit into a 400 the moment the
// window passed. A past value is inert anyway - isOverrideActive() already
// reads it as "no override" - so only the upper bound needs enforcing here:
// that is the one that can leave a seller permanently marked available.
const availabilityOverrideUntil = z
  .union([z.string().datetime(), z.null()])
  .refine(value => {
    if (value === null) return true;
    const maxMs = MAX_AVAILABILITY_OVERRIDE_HOURS * 60 * 60 * 1000;
    return new Date(value).getTime() - Date.now() <= maxMs;
  }, `La apertura extraordinaria no puede ser de más de ${MAX_AVAILABILITY_OVERRIDE_HOURS} horas`);

// `paused` (T-71) and `availabilityOverrideUntil` (T-83) are update-only
// fields: a seller that doesn't exist yet has nothing to hide from the
// listings or to open early. Leaving them out of the create schema keeps the
// sign-up payload as narrow as it was. The ownership check for writing them
// is the one PUT /api/sellers/[id] already runs (verifySellerId), the same
// one every other field here goes through.
export const updateSellerSchema = z
  .object({ ...sellerFields, paused: z.boolean(), availabilityOverrideUntil })
  .partial();

// The `[id]` segment of a seller route, validated before it reaches Mongoose -
// same reasoning and same shape as `productIdSchema` (T-97/F29): a malformed
// id is invalid input, and letting it through answers 500 with the driver's
// own `Cast to ObjectId failed ... for model "Seller"` in the body.
export const sellerIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'El id del vendedor no es válido');

// T-105. `approved` is deliberately absent from every schema above, and stays
// absent: those describe what a seller may send about their own shop, and
// putting `approved` among them hands every seller self-approval - the mass
// assignment T-13 closed. It lives here on its own, for the admin-only route
// that is the sole writer of it (`PATCH /api/sellers/admin/[id]`).
//
// `strict()` rather than Zod's default of dropping unknown keys: this is the
// one endpoint that can flip a seller's visibility, so a body carrying
// anything else is a mistake worth reporting, not worth silently ignoring.
export const approveSellerSchema = z
  .object({ approved: z.boolean({ error: '`approved` debe ser true o false' }) })
  .strict();
