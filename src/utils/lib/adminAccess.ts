/**
 * Que hacer con una request a una ruta de admin, separado de como Clerk y
 * Next entregan esos datos (middleware.js). Puro y sin dependencias: se
 * puede probar sin construir un NextRequest ni mockear @clerk/nextjs/server.
 */
export type AdminAccessDecision =
  | { action: 'allow' }
  | { action: 'signin' }
  | { action: 'redirect-home' }
  | { action: 'json'; status: 401 | 403 };

export function decideAdminAccess({
  isAdminRoute,
  isApi,
  userId,
  isAdmin,
}: {
  isAdminRoute: boolean;
  isApi: boolean;
  userId: string | null;
  isAdmin: boolean;
}): AdminAccessDecision {
  if (!isAdminRoute) {
    return { action: 'allow' };
  }

  if (!userId) {
    return isApi ? { action: 'json', status: 401 } : { action: 'signin' };
  }

  if (!isAdmin) {
    return isApi ? { action: 'json', status: 403 } : { action: 'redirect-home' };
  }

  return { action: 'allow' };
}
