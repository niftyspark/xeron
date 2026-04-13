export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { BUILTIN_SKILLS } from '@/lib/skills';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // Count active memories
    const memoriesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.memories)
      .where(
        and(
          eq(schema.memories.userId, payload.userId),
          eq(schema.memories.isActive, true)
        )
      );
    const memoriesCount = Number(memoriesResult[0]?.count ?? 0);

    // Count conversations
    const conversationsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.conversations)
      .where(eq(schema.conversations.userId, payload.userId));
    const conversationsCount = Number(conversationsResult[0]?.count ?? 0);

    // Skills count from builtin list
    const skillsEnabled = BUILTIN_SKILLS.length;

    // User tier from subscriptions or default
    let userTier = 'free';
    try {
      const sub = await db.query.userSubscriptions.findFirst({
        where: and(
          eq(schema.userSubscriptions.userId, payload.userId),
          eq(schema.userSubscriptions.status, 'active')
        ),
        with: undefined,
      });
      if (sub) {
        const subscription = await db.query.subscriptions.findFirst({
          where: eq(schema.subscriptions.id, sub.subscriptionId),
        });
        if (subscription) {
          userTier = subscription.tier;
        }
      }
    } catch {
      // If subscription tables don't exist yet, default to free
    }

    return NextResponse.json({
      memoriesCount,
      conversationsCount,
      skillsEnabled,
      userTier,
    });
  } catch (err) {
    console.error('User stats error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
