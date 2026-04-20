export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { badRequest } from '@/lib/errors';
import { LearningCreateSchema } from '@/lib/validators';

export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const logs = await db.query.learningLogs.findMany({
    where: eq(schema.learningLogs.userId, auth.userId),
    orderBy: [desc(schema.learningLogs.createdAt)],
  });
  return NextResponse.json(logs);
});

export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = LearningCreateSchema.safeParse(body);
  if (!parsed.success) throw badRequest('Invalid learning payload.');

  const [entry] = await db
    .insert(schema.learningLogs)
    .values({
      userId: auth.userId,
      trigger: parsed.data.trigger,
      lesson: parsed.data.lesson,
      appliedTo: parsed.data.appliedTo,
      confidence: parsed.data.confidence,
    })
    .returning();

  return NextResponse.json(entry);
});
