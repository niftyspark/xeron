export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, assertConversationOwnership, withErrors } from '@/lib/api-guard';
import { db, schema } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import { badRequest } from '@/lib/errors';
import { MessageCreateSchema, ConversationIdQuerySchema } from '@/lib/validators';

/**
 * GET /api/messages?conversationId=<uuid>
 * Lists messages for a conversation OWNED BY the caller. Any foreign or
 * malformed conversationId returns 404 (never reveals existence).
 */
export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = ConversationIdQuerySchema.safeParse({
    conversationId: new URL(req.url).searchParams.get('conversationId'),
  });
  if (!parsed.success) throw badRequest('Missing or invalid conversationId.');

  await assertConversationOwnership(parsed.data.conversationId, auth.userId);

  const messages = await db.query.messages.findMany({
    where: eq(schema.messages.conversationId, parsed.data.conversationId),
    orderBy: [asc(schema.messages.createdAt)],
  });
  return NextResponse.json(messages);
});

/**
 * POST /api/messages
 * Appends a message to the caller's conversation. Validates the body shape
 * and the conversation ownership before writing.
 */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = MessageCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequest('Invalid message payload.');
  }
  const { conversationId, role, content } = parsed.data;

  await assertConversationOwnership(conversationId, auth.userId);

  const [message] = await db
    .insert(schema.messages)
    .values({ conversationId, role, content })
    .returning();

  await db
    .update(schema.conversations)
    .set({ updatedAt: new Date() })
    .where(eq(schema.conversations.id, conversationId));

  return NextResponse.json(message);
});
