import { NextRequest, NextResponse } from 'next/server';
import { BUILTIN_SKILLS } from '@/lib/skills';
import { requireAuth, withErrors } from '@/lib/api-guard';

export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  // Cached aggressively — the skills catalog changes only on deploy.
  return NextResponse.json(BUILTIN_SKILLS, {
    headers: { 'Cache-Control': 'private, max-age=3600' },
  });
});
