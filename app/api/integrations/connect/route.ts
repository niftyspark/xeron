export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { initiateConnection } from '@/lib/composio';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { badRequest } from '@/lib/errors';
import { ComposioConnectSchema } from '@/lib/validators';

export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = ComposioConnectSchema.safeParse(body);
  if (!parsed.success) throw badRequest('toolkit slug is required.');

  const connectionRequest = await initiateConnection(
    auth.userId,
    parsed.data.toolkit,
    parsed.data.redirectUrl,
  );
  return NextResponse.json({ connectionRequest });
});
