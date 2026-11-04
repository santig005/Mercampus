import { connectDB } from '@/utils/connectDB';
import { Pqrs } from '@/utils/models/pqrsSchema';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createPqrsSchema } from '@/lib/validators/pqrs';
import { invalidPayload } from '@/lib/api-response';
import { enforceRateLimit } from '@/server/rate-limit/rateLimit';

export async function POST(req) {
  const limited = await enforceRateLimit(req, 'pqrs', { bodyKey: 'message' });
  if (limited) return limited;

  await connectDB();
  try {
    const parsed = createPqrsSchema.safeParse(await req.json());
    if (!parsed.success) {
      return invalidPayload(parsed.error);
    }

    const newPqrs = new Pqrs(parsed.data);
    await newPqrs.save();

    return NextResponse.json({ message: 'PQRS creada correctamente.' }, { status: 201 });
  } catch (error) {
    logger.error('Error al crear la PQRS', error);
    return NextResponse.json(
      { message: 'Error al crear la PQRS.' },
      { status: 500 }
    );
  }
}