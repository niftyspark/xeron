export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSkillSystemPrompt } from '@/lib/skills';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { getRelevantMemories } from '@/lib/ai';
import { badRequest, serviceUnavailable } from '@/lib/errors';
import { ChatRequestSchema } from '@/lib/validators';

const API_URL = 'https://ai.api.4everland.org/api/v1/chat/completions';

/**
 * POST /api/ai/chat
 *
 * Audit #10 addressed: the jailbreak system prompt has been replaced with a
 * production-appropriate persona. The upstream provider's safety policies are
 * followed; any "ignore safety" language has been removed.
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
  let memoriesContext = '';
  try {
    const memories = await getRelevantMemories(auth.userId, '', 10);
    if (memories.length > 0) {
      memoriesContext =
        '\n\n## PERSISTENT MEMORIES ABOUT THIS USER:\n' +
        memories.map((m) => `- [${m.category}] ${m.content}`).join('\n') +
        '\n\nUse these memories to personalise your responses when relevant.';
    }
  } catch (err) {
    console.warn('[chat] memory load failed:', err);
  }

  const basePrompt = `You are XERON, a helpful, honest autonomous AI assistant.

## Your Capabilities
- Persistent memory across conversations
- Multi-step reasoning and task execution
- 500+ app integrations via Composio (GitHub, Slack, Notion, Gmail, etc.)

## Guidelines
- Follow your provider's safety policies and applicable laws.
- Be proactive and suggest next actions when appropriate.
- Remember and reference details about the user from your memories.
- Break complex tasks into manageable steps and show your reasoning.
- Decline clearly and briefly if a request is unsafe or outside policy.${memoriesContext}`;

  // Honor skillIds (previously ignored — audit #26).
  const skillPrompt = getSkillSystemPrompt(skills);

  const enhancedMessages = [
    { role: 'system' as const, content: basePrompt + skillPrompt },
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
