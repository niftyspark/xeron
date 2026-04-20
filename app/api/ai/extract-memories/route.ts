export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  assertConversationOwnership,
  withErrors,
} from '@/lib/api-guard';
import { extractMemories, type ChatMessage } from '@/lib/ai';
import { badRequest } from '@/lib/errors';
import { ExtractMemoriesSchema } from '@/lib/validators';

export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = ExtractMemoriesSchema.safeParse(body);
  if (!parsed.success) throw badRequest('Invalid extract-memories payload.');

  // Ownership check: memory rows will be tagged with this conversationId as
  // their source, so it MUST belong to the caller.
  await assertConversationOwnership(parsed.data.conversationId, auth.userId);

  const chatMessages: ChatMessage[] = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  await extractMemories(auth.userId, parsed.data.conversationId, chatMessages);
  return NextResponse.json({ success: true });
});
