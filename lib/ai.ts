import { db, schema } from './db';

/**
 * Shared AI types and DB-side helpers.
 *
 * Orphan functions removed (audit #7): the old `streamChat` /
 * `buildSystemPrompt` are gone — the active chat handler (/api/ai/chat/route.ts)
 * owns its own prompt + stream logic and is the single source of truth.
 */

const API_URL = 'https://ai.api.4everland.org/api/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Returns the caller's most relevant active memories for prompt injection. */
export async function getRelevantMemories(
  userId: string,
  _query: string,
  limit = 5,
) {
  return await db.query.memories.findMany({
    where: (memories, { and, eq }) =>
      and(eq(memories.userId, userId), eq(memories.isActive, true)),
    orderBy: (memories, { desc }) => [
      desc(memories.importance),
      desc(memories.accessCount),
    ],
    limit,
  });
}

/**
 * Extracts factual memories from a conversation and persists them under the
 * given userId. Uses the AI provider as a classifier.
 *
 * Audit fixes:
 *  - Rejects malformed memory objects (null content, wrong type, too long)
 *    instead of crashing the Drizzle insert.
 *  - Logs errors to the server log — no more silent `catch {}`.
 *  - Caller is responsible for verifying that `conversationId` belongs to
 *    `userId` (done in /api/ai/extract-memories/route.ts).
 */
export async function extractMemories(
  userId: string,
  conversationId: string,
  messages: ChatMessage[],
): Promise<void> {
  const apiKey = process.env.FOUR_EVER_LAND_API_KEY;
  if (!apiKey) return;

  const extractionPrompt = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
  const extractionMessages: ChatMessage[] = [
    {
      role: 'system',
      content: `Analyze this conversation and extract key facts, preferences, and learnings that should be remembered.
Return a JSON array of memory objects with: category ("fact"|"preference"|"learned"), content (the memory text), importance (0.0-1.0).
Only extract information that is specific and actionable. Return empty array if nothing worth remembering.`,
    },
    { role: 'user', content: extractionPrompt },
  ];

  let response: Response;
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-opus-4.6',
        messages: extractionMessages,
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });
  } catch (err) {
    console.warn('[extractMemories] network error', err);
    return;
  }

  if (!response.ok) {
    const text = (await response.text().catch(() => '')).slice(0, 300);
    console.warn('[extractMemories] provider error', response.status, text);
    return;
  }

  let data: { choices?: { message?: { content?: string } }[] };
  try {
    data = await response.json();
  } catch (err) {
    console.warn('[extractMemories] bad JSON from provider', err);
    return;
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Provider sometimes wraps JSON in markdown code fences; try to recover.
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        parsed = JSON.parse(match[1]);
      } catch {
        console.warn('[extractMemories] provider returned unparseable content');
        return;
      }
    } else {
      return;
    }
  }

  if (!Array.isArray(parsed)) return;

  const validCategories = new Set(['fact', 'preference', 'learned']);

  for (const raw of parsed) {
    if (!raw || typeof raw !== 'object') continue;
    const m = raw as { category?: unknown; content?: unknown; importance?: unknown };
    if (typeof m.content !== 'string') continue;
    const trimmed = m.content.trim();
    if (!trimmed || trimmed.length > 2000) continue;

    const category =
      typeof m.category === 'string' && validCategories.has(m.category)
        ? m.category
        : 'fact';

    const importance =
      typeof m.importance === 'number' && m.importance >= 0 && m.importance <= 1
        ? m.importance
        : 0.5;

    try {
      await db.insert(schema.memories).values({
        userId,
        category,
        content: trimmed,
        importance,
        sourceConversationId: conversationId,
      });
    } catch (err) {
      // Likely a FK violation if the conversationId disappeared; log and skip.
      console.warn('[extractMemories] insert failed', err);
    }
  }
}
