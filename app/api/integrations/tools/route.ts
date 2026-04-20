export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listTools } from '@/lib/composio';
import { requireAuth, withErrors } from '@/lib/api-guard';

export const GET = withErrors(async (req: NextRequest) => {
  // Audit #24: authenticate before hitting the paid upstream.
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const toolkit = req.nextUrl.searchParams.get('toolkit') ?? undefined;
  const result = await listTools(toolkit);
  const tools = Array.isArray(result)
    ? result
    : (result as { items?: unknown[] })?.items ?? result;
  return NextResponse.json({ tools });
});
