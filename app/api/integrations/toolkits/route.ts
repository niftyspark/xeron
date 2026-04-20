export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listToolkits, getToolkit } from '@/lib/composio';
import { requireAuth, withErrors } from '@/lib/api-guard';

export const GET = withErrors(async (req: NextRequest) => {
  // Audit #24: authenticate before hitting the paid upstream.
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const slug = req.nextUrl.searchParams.get('slug');
  if (slug) {
    const toolkit = await getToolkit(slug);
    return NextResponse.json({ toolkit });
  }

  const result = await listToolkits();
  const toolkits = Array.isArray(result)
    ? result
    : (result as { items?: unknown[] })?.items ?? result;
  return NextResponse.json({ toolkits });
});
