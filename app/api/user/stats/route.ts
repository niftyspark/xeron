export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { db, schema } from '@/lib/db';
import { and, eq, sql } from 'drizzle-orm';
import { BUILTIN_SKILLS } from '@/lib/skills';

export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const [memoriesRow, conversationsRow] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.memories)
      .where(
        and(
          eq(schema.memories.userId, auth.userId),
          eq(schema.memories.isActive, true),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.conversations)
      .where(eq(schema.conversations.userId, auth.userId)),
  ]);

  const memoriesCount = Number(memoriesRow[0]?.count ?? 0);
  const conversationsCount = Number(conversationsRow[0]?.count ?? 0);
  const skillsEnabled = BUILTIN_SKILLS.length;

  // Fetch active subscription with a single JOIN (audit #69 N+1 fix).
  let userTier = 'free';
  const subRows = await db
    .select({ tier: schema.subscriptions.tier })
    .from(schema.userSubscriptions)
    .innerJoin(
      schema.subscriptions,
      eq(schema.userSubscriptions.subscriptionId, schema.subscriptions.id),
    )
    .where(
      and(
        eq(schema.userSubscriptions.userId, auth.userId),
        eq(schema.userSubscriptions.status, 'active'),
      ),
    )
    .limit(1);
  if (subRows[0]?.tier) userTier = subRows[0].tier;

  return NextResponse.json({
    memoriesCount,
    conversationsCount,
    skillsEnabled,
    userTier,
  });
});
