export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { executeTool } from '@/lib/composio';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { badRequest } from '@/lib/errors';
import { ComposioExecuteSchema } from '@/lib/validators';

export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = ComposioExecuteSchema.safeParse(body);
  if (!parsed.success) throw badRequest('tool slug is required.');

  // Composio scopes tool execution by the userId we pass. Since we pass the
  // caller's own ID, cross-user execution is impossible at the SDK boundary.
  const result = await executeTool(parsed.data.tool, auth.userId, parsed.data.params ?? {});
  return NextResponse.json({ result });
});
