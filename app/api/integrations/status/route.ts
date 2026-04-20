export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  assertComposioConnectionOwnership,
  withErrors,
} from '@/lib/api-guard';
import { badRequest } from '@/lib/errors';

export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const connectionId = req.nextUrl.searchParams.get('id');
  if (!connectionId) throw badRequest('Missing connection id.');

  // Throws 404 if the connection exists but belongs to another user.
  const account = await assertComposioConnectionOwnership(connectionId, auth.userId);

  return NextResponse.json({
    id: (account as { id: string }).id,
    status: (account as { status: string }).status,
    toolkitSlug:
      (account as { toolkitSlug?: string; appName?: string }).toolkitSlug ??
      (account as { appName?: string }).appName ??
      null,
  });
});
