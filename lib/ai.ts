import { db, schema } from './db';
import {
  TOOL_DEFINITIONS,
  executeTool,
  type ToolCallRequest,
  type ToolDefinition,
} from './tools';

/**
 * Shared AI types and DB-side helpers.
 *
 * Orphan functions removed (audit #7): the old `streamChat` /
 * `buildSystemPrompt` are gone — the active chat handler (/api/ai/chat/route.ts)
 * owns its own prompt + stream logic and is the single source of truth.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Hard cap to prevent runaway tool loops (also limits provider cost). */
const MAX_TOOL_ROUNDS = 4;

export type AIProvider = 'groq';

export function getProviderConfig(provider: AIProvider) {
  switch (provider) {
    case 'groq':
      return {
        apiUrl: GROQ_API_URL,
        apiKey: process.env.GROQ_API_KEY,
      };
  }
}

/** Map provider-agnostic model IDs to Groq models. */
export function mapModelForProvider(model: string, _provider: AIProvider): string {
  const modelMap: Record<string, string> = {
    'anthropic/claude-opus-4.6': 'llama-3.3-70b-versatile',
    'anthropic/claude-opus-4.7': 'llama-3.3-70b-versatile',
    'anthropic/claude-sonnet-4': 'llama-3.3-70b-versatile',
    'anthropic/claude-3.5-haiku': 'llama-3.1-8b-instant',
    'anthropic/claude-3-haiku': 'llama-3.1-8b-instant',
    'openai/gpt-4o': 'llama-3.3-70b-versatile',
    'openai/gpt-4o-mini': 'llama-3.1-8b-instant',
    'openai/gpt-4-turbo': 'llama-3.3-70b-versatile',
  };

  return modelMap[model] || 'llama-3.3-70b-versatile';
}

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
  const { apiUrl, apiKey } = getProviderConfig('groq');
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
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
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

// ─────────────────────────────────────────────────────────────────────────────
// Tool-calling chat loop
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A wire-format message as we hand it back to the provider. Keeps `tool_calls`
 * and `tool_call_id` optional so we can mix assistant-with-tools, tool-result,
 * and plain messages in one array.
 */
interface WireMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

interface StreamChatWithToolsOptions {
  provider: AIProvider;
  model: string;
  temperature: number;
  messages: WireMessage[];
  signal: AbortSignal;
  /**
   * Tool definitions to pass to the provider. If omitted, the full
   * TOOL_DEFINITIONS registry is used (back-compat). Pass an empty array
   * to disable tool-calling entirely (the request becomes a simple chat
   * completion with no tool round-trips).
   */
  tools?: readonly ToolDefinition[];
}

/**
 * Runs a chat completion with tool-calling support, then returns a streamed
 * Response of the FINAL assistant answer.
 *
 * Flow:
 *  1. Non-streaming completion with `tools: TOOL_DEFINITIONS`.
 *  2. If the model returned `tool_calls`, execute each one in parallel,
 *     append the assistant+tool messages to the conversation, and loop.
 *  3. Bounded by MAX_TOOL_ROUNDS.
 *  4. Once the model returns plain content (no tool_calls), replay that
 *     content as an SSE stream in the OpenAI chat-completion chunk format,
 *     so the existing client-side reader in useStreaming.ts works unchanged.
 *
 * We intentionally do NOT stream the intermediate tool-call rounds to the
 * client — the user would see partial JSON chunks. Intermediate rounds are
 * non-streamed; only the final response is streamed.
 */
export async function streamChatWithTools(
  opts: StreamChatWithToolsOptions,
): Promise<Response> {
  const { provider, model, temperature, signal } = opts;
  const { apiUrl, apiKey } = getProviderConfig(provider);
  
  if (!apiKey) {
    throw new Error(`Provider ${provider} is not configured on the server.`);
  }

  const mappedModel = mapModelForProvider(model, provider);
  const messages: WireMessage[] = [...opts.messages];

  // Resolve tools: explicit array wins, otherwise full registry.
  const tools = opts.tools ?? TOOL_DEFINITIONS;
  const toolsActive = tools.length > 0;

  let finalContent = '';

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    // Round 0 is the first call; subsequent rounds happen only if the prior
    // response contained tool_calls. The final round MUST be stop-type so we
    // have content to stream back.
    const lastRound = round === MAX_TOOL_ROUNDS;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: mappedModel,
        messages,
        temperature,
        top_p: 1,
        stream: false,
        // On the last round, force the model to answer without calling tools.
        // If tools are disabled for this user, we skip the whole dance.
        tools: !toolsActive || lastRound ? undefined : tools,
        tool_choice: !toolsActive || lastRound ? undefined : 'auto',
      }),
      signal,
    });

    if (!res.ok) {
      const errText = (await res.text().catch(() => '')).slice(0, 500);
      console.error('[chat] provider error', res.status, errText);
      throw new Error(`Provider ${res.status}: ${errText}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: {
          role?: string;
          content?: string | null;
          tool_calls?: Array<{
            id: string;
            type: 'function';
            function: { name: string; arguments: string };
          }>;
        };
        finish_reason?: string;
      }>;
    };

    const choice = data.choices?.[0];
    const msg = choice?.message;
    if (!msg) throw new Error('Provider returned no message.');

    const toolCalls = msg.tool_calls ?? [];

    // No tool calls → we have the final answer.
    if (toolCalls.length === 0) {
      finalContent = msg.content ?? '';
      break;
    }

    if (lastRound) {
      // Model still wants to call tools on the last allowed round — force
      // it to settle with whatever content it gave.
      finalContent =
        msg.content ??
        'I reached the tool-call limit without producing a final answer. Please try rephrasing.';
      break;
    }

    // Append the assistant's tool-call turn to the transcript.
    messages.push({
      role: 'assistant',
      content: msg.content ?? null,
      tool_calls: toolCalls,
    });

    // Execute every requested tool in parallel. executeTool() never throws.
    console.log(
      `[chat] round ${round}: executing ${toolCalls.length} tool call(s):`,
      toolCalls.map((c) => c.function.name).join(', '),
    );

    const toolRequests: ToolCallRequest[] = toolCalls.map((c) => ({
      id: c.id,
      name: c.function.name,
      rawArguments: c.function.arguments,
    }));
    const results = await Promise.all(
      toolRequests.map((r) => executeTool(r, signal)),
    );

    // Append each tool result as a separate `tool` role message.
    for (const r of results) {
      messages.push({
        role: 'tool',
        content: r.content,
        tool_call_id: r.toolCallId,
        name: r.name,
      });
    }
  }

  // Stream the final content back in OpenAI chat-completion chunk format so
  // the existing client reader (useStreaming.ts) parses it unchanged.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send the content in reasonably-sized chunks so the UI animates
      // instead of dropping the whole answer at once. Character-level chunking
      // is wasteful; paragraph chunks are too coarse. 64-char chunks strike a
      // balance without adding artificial delays.
      const chunkSize = 64;
      let offset = 0;
      while (offset < finalContent.length) {
        const piece = finalContent.slice(offset, offset + chunkSize);
        offset += chunkSize;
        const payload = {
          choices: [{ delta: { content: piece } }],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
