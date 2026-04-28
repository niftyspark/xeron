export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { streamChatWithTools, type AIProvider } from '@/lib/ai';
import { badRequest } from '@/lib/errors';
import { ChatRequestSchema } from '@/lib/validators';

export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) throw badRequest('Invalid chat payload.');
  
  const { messages, temperature = 0.7 } = parsed.data;
  
  const provider: AIProvider = 'groq';
  const model = 'llama-3.3-70b-versatile';

  console.log('[chat] Request received:', { model, messageCount: messages.length });

  const result = await streamChatWithTools({
    provider,
    model,
    temperature,
    messages: messages.filter((m: { role: string; content: string }) => m.role !== 'system'),
    signal: req.signal,
  });

  console.log('[chat] Response status:', result.status);

  return result;
});