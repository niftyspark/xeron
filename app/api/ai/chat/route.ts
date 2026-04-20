export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSkillSystemPrompt } from '@/lib/skills';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { getRelevantMemories, streamChatWithTools } from '@/lib/ai';
import { badRequest, serviceUnavailable } from '@/lib/errors';
import { ChatRequestSchema } from '@/lib/validators';
import { composeSystemPrompt } from '@/lib/character';

/**
 * POST /api/ai/chat
 *
 * Xeron chat endpoint with function-calling support. The assistant has two
 * always-available tools exposed via lib/tools.ts:
 *   - web_search  → Tavily
 *   - analyze_image → Cloudflare Llama 3.2 Vision
 *
 * The tool-call loop lives in lib/ai.streamChatWithTools. This handler is
 * responsible for authentication, payload validation, and composing the
 * system prompt from the persona + memories + user-enabled skills.
 */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) throw badRequest('Invalid chat payload.');
  const { messages, model = 'anthropic/claude-opus-4.7', skills = [], temperature = 0.7 } =
    parsed.data;

  const apiKey = process.env.FOUR_EVER_LAND_API_KEY;
  if (!apiKey) throw serviceUnavailable('AI is not configured on the server.');

  // Memories: graceful degradation if DB is unreachable.
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

  // Honor user-enabled skillIds (audit #26). Empty string when none.
  const skillsBlock = getSkillSystemPrompt(skills);

  const systemPrompt = composeSystemPrompt(memoriesBlock, skillsBlock);

  const enhancedMessages = [
    { role: 'system' as const, content: systemPrompt, tool_calls: undefined },
    ...messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content })),
  ];

  return await streamChatWithTools({
    apiKey,
    model,
    temperature,
    messages: enhancedMessages,
    signal: req.signal,
  });
});
