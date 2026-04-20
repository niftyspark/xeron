export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { db, schema } from '@/lib/db';
import { and, eq, desc } from 'drizzle-orm';

/**
 * GET /api/ai/memory
 *
 * Returns the caller's 10 most-recent ACTIVE memories. This differs from the
 * general /api/memories only in the `limit: 10` and its internal use by the
 * chat flow. Both endpoints scope by userId and isActive = true.
 */
export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const memories = await db.query.memories.findMany({
    where: and(
      eq(schema.memories.userId, auth.userId),
      eq(schema.memories.isActive, true),
    ),
    orderBy: [desc(schema.memories.createdAt)],
    limit: 10,
  });

  return NextResponse.json(memories);
});
