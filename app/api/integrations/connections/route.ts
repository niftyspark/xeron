export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getConnectedAccounts, deleteConnectedAccount } from '@/lib/composio';
import { requireAuth, findConnectionForUser, withErrors } from '@/lib/api-guard';
import { badRequest } from '@/lib/errors';
import { ComposioDisconnectSchema } from '@/lib/validators';

export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  // getConnectedAccounts already scopes by userId on the Composio side.
  const result = await getConnectedAccounts(auth.userId);
  const connections = Array.isArray(result)
    ? result
    : (result as { items?: unknown[] })?.items ?? result;
  return NextResponse.json({ connections });
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = ComposioDisconnectSchema.safeParse(body);
  if (!parsed.success) throw badRequest('connectedAccountId is required.');

  // Authoritative check via the user-scoped list (IDOR-safe regardless of
  // Composio response-shape variations). Throws 404 if the connection
  // doesn't exist or belongs to someone else.
  await findConnectionForUser(parsed.data.connectedAccountId, auth.userId);

  await deleteConnectedAccount(parsed.data.connectedAccountId);
  return NextResponse.json({ message: 'Disconnected' });
});
