export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getSkillSystemPrompt } from '@/lib/skills';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { getRelevantMemories, streamChatWithTools } from '@/lib/ai';
import { badRequest, serviceUnavailable } from '@/lib/errors';
import {
  ChatRequestSchema,
  DEFAULT_USER_PREFERENCES,
  UserPreferencesSchema,
  type UserPreferences,
} from '@/lib/validators';
import {
  composeSystemPrompt,
  buildToolsBlock,
} from '@/lib/character';
import { TOOL_DEFINITIONS } from '@/lib/tools';
import { db, schema } from '@/lib/db';

/**
 * POST /api/ai/chat
 *
 * Xeron chat endpoint with server-side preference control.
 *
 * Per-user toggles stored at users.settings.preferences gate what gets
 * injected into each request:
 *   - memoryEnabled      => include relevant memories in the system prompt
 *   - toolsEnabled.*     => include each tool in the `tools:` parameter
 *   - enabledSkillIds    => include only these skills in the prompt
 *   - customSystemPrompt => if non-empty, replaces the Xeron persona
 *
 * Preferences live on the server so clients can't tamper with them to
 * bypass quota or inject prompt content.
 */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) throw badRequest('Invalid chat payload.');
  const { messages, model = 'anthropic/claude-opus-4.7', temperature = 0.7 } =
    parsed.data;

  const apiKey = process.env.FOUR_EVER_LAND_API_KEY;
  if (!apiKey) throw serviceUnavailable('AI is not configured on the server.');

  // ── Load preferences (single DB round-trip, reuses the auth user row). ──
  let preferences: UserPreferences;
  try {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, auth.userId),
      columns: { settings: true },
    });
    const raw =
      (user?.settings as { preferences?: unknown } | null)?.preferences ?? {};
    const res = UserPreferencesSchema.safeParse(raw);
    preferences = res.success ? res.data : DEFAULT_USER_PREFERENCES;
  } catch (err) {
    // Degrade gracefully: if the preferences read fails, keep chat working
    // with defaults rather than 500-ing the user.
    console.warn('[chat] preferences load failed, using defaults:', err);
    preferences = DEFAULT_USER_PREFERENCES;
  }

  // ── Memories (only if the user opted in). ──
  let memoriesBlock = '';
  if (preferences.memoryEnabled) {
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
  }

  // ── Skills (user-picked subset, audit #26). ──
  const skillsBlock = getSkillSystemPrompt(preferences.enabledSkillIds);

  // ── Tools (filtered by per-user toggles). ──
  const activeTools = TOOL_DEFINITIONS.filter((t) => {
    const name = t.function.name as keyof UserPreferences['toolsEnabled'];
    return preferences.toolsEnabled[name] ?? false;
  });
  const toolsBlock = buildToolsBlock(
    activeTools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
    })),
  );

  // ── Compose the system prompt. Custom prompt, if set, wins over Xeron. ──
  const systemPrompt = composeSystemPrompt({
    customSystemPrompt: preferences.customSystemPrompt,
    memoriesBlock,
    skillsBlock,
    toolsBlock,
  });

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
    // Pass only the tools the user has enabled.
    tools: activeTools,
    signal: req.signal,
  });
});
