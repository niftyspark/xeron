export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  assertConversationOwnership,
  withErrors,
} from '@/lib/api-guard';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { badRequest } from '@/lib/errors';
import { ConversationCreateSchema } from '@/lib/validators';

export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const conversations = await db.query.conversations.findMany({
    where: eq(schema.conversations.userId, auth.userId),
    orderBy: [desc(schema.conversations.updatedAt)],
  });
  return NextResponse.json(conversations);
});

export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = ConversationCreateSchema.safeParse(body);
  if (!parsed.success) throw badRequest('Invalid conversation payload.');

  const [conversation] = await db
    .insert(schema.conversations)
    .values({
      userId: auth.userId,
      title: parsed.data.title,
      model: parsed.data.model,
    })
    .returning();

  return NextResponse.json(conversation);
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw badRequest('Missing conversation id.');

  // 404 on foreign/missing; never leaks existence.
  await assertConversationOwnership(id, auth.userId);

  await db
    .delete(schema.conversations)
    .where(eq(schema.conversations.id, id));

  return NextResponse.json({ success: true });
});
