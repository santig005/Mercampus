/**
 * What to do with a request to an admin route, separated from how Clerk and
 * Next deliver that data (middleware.js). Pure and dependency-free: it can be
 * tested without building a NextRequest or mocking @clerk/nextjs/server.
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
