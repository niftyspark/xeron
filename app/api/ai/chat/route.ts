export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSkillSystemPrompt } from '@/lib/skills';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { getRelevantMemories } from '@/lib/ai';
import { badRequest, serviceUnavailable } from '@/lib/errors';
import { ChatRequestSchema } from '@/lib/validators';
import { composeSystemPrompt } from '@/lib/character';

const API_URL = 'https://ai.api.4everland.org/api/v1/chat/completions';

/**
 * POST /api/ai/chat
 *
 * The system prompt is now sourced from the Xeron character definition
 * (lib/character.ts) rather than a generic "helpful assistant" base.
 * Memories and user-enabled skills are still dynamically composed in
 * via composeSystemPrompt().
 */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) throw badRequest('Invalid chat payload.');
  const { messages, model = 'anthropic/claude-opus-4.6', skills = [], temperature = 0.7 } =
    parsed.data;

  const apiKey = process.env.FOUR_EVER_LAND_API_KEY;
  if (!apiKey) throw serviceUnavailable('AI is not configured on the server.');

  // Load user memories, degraded-mode if DB is unreachable.
  let memoriesBlock = '';
  try {
    const memories = await getRelevantMemories(auth.userId, '', 10);
    if (memories.length > 0) {
      memoriesBlock =
        '## Persistent memories about this user\n' +
        memories.map((m) => `- [${m.category}] ${m.content}`).join('\n');
    }
  } catch (err) {
    console.warn('[chat] memory load failed:', err);
  }

  // Honor user-enabled skillIds (audit #26). Returns empty string if none.
  const skillsBlock = getSkillSystemPrompt(skills);

  // Compose: persona (static) + memories (dynamic) + skills (dynamic).
  const systemPrompt = composeSystemPrompt(memoriesBlock, skillsBlock);

  const enhancedMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.filter((m) => m.role !== 'system'),
  ];

  const upstream = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: enhancedMessages,
      temperature,
      top_p: 1,
      stream: true,
    }),
    // Propagate client aborts so upstream doesn't keep billing us.
    signal: req.signal,
  });

  if (!upstream.ok) {
    const errorText = (await upstream.text()).slice(0, 500);
    console.error('[chat] upstream error', upstream.status, errorText);
    return NextResponse.json(
      { error: 'AI provider error.' },
      { status: upstream.status },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }
      // Clean up on client abort.
      const onAbort = () => {
        reader.cancel().catch(() => {});
      };
      req.signal.addEventListener('abort', onAbort);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            break;
          }
          controller.enqueue(value);
        }
      } catch (err) {
        controller.error(err);
      } finally {
        req.signal.removeEventListener('abort', onAbort);
        try {
          reader.releaseLock();
        } catch {
          /* already released */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
});
