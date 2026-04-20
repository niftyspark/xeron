export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, findConnectionForUser, withErrors } from '@/lib/api-guard';
import { badRequest } from '@/lib/errors';

/**
 * GET /api/integrations/status?id=<connectedAccountId>
 *
 * Used by /dashboard/tools polling after the OAuth popup completes. Returns
 * the live status string (typically 'INITIATED' → 'ACTIVE' once the user
 * authorizes). The lookup is scoped server-side to the caller's userId via
 * findConnectionForUser, so it both avoids IDOR and tolerates the variations
 * in Composio's per-version response shape that previously made this
 * endpoint return 404 forever.
 */
export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const connectionId = req.nextUrl.searchParams.get('id');
  if (!connectionId) throw badRequest('Missing connection id.');

  const account = await findConnectionForUser(connectionId, auth.userId);

  // Composio returns the status under several keys depending on SDK version
  // and auth scheme. Try the canonical ones in priority order.
  const status =
    (account.status as string | undefined) ??
    (account.connectionStatus as string | undefined) ??
    ((account.data as { status?: string } | undefined)?.status) ??
    'UNKNOWN';

  const toolkitSlug =
    (account.toolkitSlug as string | undefined) ??
    (account.appName as string | undefined) ??
    (account.appUniqueId as string | undefined) ??
    null;

  return NextResponse.json({
    id: account.id,
    status,
    toolkitSlug,
  });
});
