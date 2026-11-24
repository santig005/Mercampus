import { NextResponse } from 'next/server';

import { errorResponse } from '@/lib/api-response';
import { connectDB } from '@/utils/connectDB';
import { AppError } from '@/utils/lib/errors';
import { getClerkUserId } from '@/utils/lib/auth';
import { isClerkAdmin } from '@/utils/lib/isClerkAdmin';
import { Report } from '@/utils/models/reportSchema';

// T-149. Read-only: resolving or dismissing a report is T-52's job. Same
// double gate as GET /api/sellers/admin (T-133) - the middleware's
// `/api/(.*)/admin(.*)` matcher is defence in depth, not the only door.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const clerkId = await getClerkUserId();
    if (!(await isClerkAdmin(clerkId))) {
      throw new AppError('No autorizado.', 403);
    }

    await connectDB();

    const reports = await Report.find({ status: 'open' })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        reports,
        total: reports.length,
        message:
          reports.length === 0
            ? 'No hay reportes abiertos'
            : 'Reportes obtenidos exitosamente para administración',
      },
      { status: 200 }
    );
  } catch (error) {
    return errorResponse(error, '[GET /api/reports/admin]', { bodyKey: 'message' });
  }
}
