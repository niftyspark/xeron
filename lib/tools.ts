/**
 * Server-side tool registry for the chat agent.
 *
 * The AI model (via 4everland's OpenAI-compatible chat-completions endpoint)
 * receives the `definitions` array as its `tools` parameter and can choose to
 * emit a `tool_calls` array instead of a plain assistant message. When that
 * happens, /api/ai/chat intercepts the interrupt, runs the named tool via
 * `executeTool()`, appends the tool's result back into the message list, and
 * resumes the completion. The client sees a normal streamed response.
 *
 * Adding a new tool = add a definition + an executor entry in TOOL_IMPL.
 * Everything else is generic.
 */

const SERPER_URL = 'https://google.serper.dev/search';
const CF_VISION_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

// ─────────────────────────────────────────────────────────────────────────────
// Tool definitions — OpenAI/Anthropic-compatible function-calling schema.
// Keep parameter descriptions terse but concrete; the model reads these to
// decide when to call each tool.
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
}

export const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description:
        "Search Google via Serper. Use when the user asks about current events, recent facts, URLs, product prices, docs, or anything beyond your training cutoff. Returns Google's answer box (if any), the People-Also-Ask snippet, and the top organic results with title/link/snippet.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'The search query. Be specific and include relevant keywords. Do not include conversational filler.',
          },
          max_results: {
            type: 'integer',
            description: 'How many organic results to return (1-10). Default 5.',
            minimum: 1,
            maximum: 10,
          },
          gl: {
            type: 'string',
            description:
              "Two-letter country code (e.g. 'us', 'uk', 'in') to localize results. Default 'us'.",
          },
          hl: {
            type: 'string',
            description: "Language code (e.g. 'en'). Default 'en'.",
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_image',
      description:
        'Analyze an image using a vision model. Accepts a data URI (data:image/...;base64,...) or an https:// URL. Returns a textual description. Use when the user refers to an image by URL or asks follow-up questions about an already-attached image.',
      parameters: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            description:
              "Either a 'data:image/...;base64,...' URI or an 'https://...' URL pointing to an image (png/jpeg/webp).",
          },
          question: {
            type: 'string',
            description:
              "Optional specific question about the image. If omitted, returns a general description.",
          },
        },
        required: ['source'],
        additionalProperties: false,
      },
    },
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Executor
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolCallRequest {
  id: string;
  name: string;
  /** JSON-string arguments as emitted by the model. We parse + validate here. */
  rawArguments: string;
}

export interface ToolCallResult {
  toolCallId: string;
  name: string;
  /** Stringified content returned to the model as the tool's output. */
  content: string;
}

/**
 * Dispatches a single tool call. Never throws — tool errors are serialised
 * back to the model as a string so it can recover gracefully ("the search
 * failed, let me try rephrasing").
 */
export async function executeTool(
  call: ToolCallRequest,
  signal?: AbortSignal,
): Promise<ToolCallResult> {
  const impl = TOOL_IMPL[call.name];
  if (!impl) {
    return {
      toolCallId: call.id,
      name: call.name,
      content: JSON.stringify({ error: `Unknown tool: ${call.name}` }),
    };
  }

  let args: unknown;
  try {
    args = call.rawArguments ? JSON.parse(call.rawArguments) : {};
  } catch {
    return {
      toolCallId: call.id,
      name: call.name,
      content: JSON.stringify({
        error: 'Tool arguments were not valid JSON.',
        rawArguments: call.rawArguments.slice(0, 500),
      }),
    };
  }

  try {
    const result = await impl(args, signal);
    return {
      toolCallId: call.id,
      name: call.name,
      content: typeof result === 'string' ? result : JSON.stringify(result),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      toolCallId: call.id,
      name: call.name,
      content: JSON.stringify({ error: `Tool execution failed: ${message}` }),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual tool implementations
// ─────────────────────────────────────────────────────────────────────────────

type ToolImpl = (args: unknown, signal?: AbortSignal) => Promise<unknown>;

const TOOL_IMPL: Record<string, ToolImpl> = {
  web_search: async (args, signal) => {
    const { query, max_results, gl, hl } = parseWebSearchArgs(args);

    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      return {
        error:
          'Web search is not configured on the server (SERPER_API_KEY missing).',
      };
    }

    // Serper's API: POST JSON body, key in X-API-KEY header. Returns
    // Google's SERP shape: { answerBox?, knowledgeGraph?, organic[],
    // peopleAlsoAsk?, relatedSearches? }.
    const res = await fetch(SERPER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        q: query,
        num: max_results ?? 5,
        gl: gl ?? 'us',
        hl: hl ?? 'en',
      }),
      signal,
    });

    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 300);
      return { error: `Serper responded ${res.status}: ${text}` };
    }

    const data = (await res.json()) as {
      answerBox?: { answer?: string; snippet?: string; title?: string };
      knowledgeGraph?: { description?: string; title?: string };
      organic?: Array<{
        title?: string;
        link?: string;
        snippet?: string;
        date?: string;
      }>;
      peopleAlsoAsk?: Array<{ question?: string; snippet?: string }>;
    };

    // Pull out a single direct-answer string if Google has one for this query.
    const answer =
      data.answerBox?.answer ??
      data.answerBox?.snippet ??
      data.knowledgeGraph?.description ??
      null;

    // Cap snippets to keep the context window sane.
    const results = (data.organic ?? [])
      .slice(0, max_results ?? 5)
      .map((r) => ({
        title: r.title ?? '',
        url: r.link ?? '',
        snippet: (r.snippet ?? '').slice(0, 500),
        ...(r.date ? { date: r.date } : {}),
      }));

    // Top 3 follow-up questions can help the model decide whether to do a
    // second search; cap content size.
    const relatedQuestions = (data.peopleAlsoAsk ?? [])
      .slice(0, 3)
      .map((q) => ({
        question: q.question ?? '',
        snippet: (q.snippet ?? '').slice(0, 300),
      }));

    return {
      query,
      answer,
      results,
      ...(relatedQuestions.length > 0 ? { relatedQuestions } : {}),
    };
  },

  analyze_image: async (args, signal) => {
    const { source, question } = parseAnalyzeImageArgs(args);

    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfApiToken = process.env.CLOUDFLARE_AI_TOKEN;
    if (!cfAccountId || !cfApiToken) {
      return { error: 'Image analysis is not configured on the server.' };
    }

    // Accept either a data URI or an https URL. For https URLs we do NOT
    // download+re-upload — Cloudflare's vision model accepts URLs directly
    // in the image_url.url field. This saves bandwidth and the egress cost.
    let imageUrl: string;
    if (source.startsWith('data:image/')) {
      imageUrl = source;
    } else if (source.startsWith('https://')) {
      imageUrl = source;
    } else if (source.startsWith('http://')) {
      return {
        error: 'Only https image URLs are allowed (for transport security).',
      };
    } else {
      return {
        error:
          "Image source must be a data URI (data:image/...;base64,...) or an https URL.",
      };
    }

    const prompt =
      question ??
      'Describe this image in detail. What do you see? Be specific about objects, colors, text, and context.';

    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${CF_VISION_MODEL}`;
    const cfRes = await fetch(cfUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        max_tokens: 1024,
      }),
      signal,
    });

    if (!cfRes.ok) {
      const text = (await cfRes.text().catch(() => '')).slice(0, 300);
      return { error: `Vision model responded ${cfRes.status}: ${text}` };
    }

    const data = (await cfRes.json()) as {
      result?: { response?: string };
      response?: string;
    };
    const analysis = data.result?.response ?? data.response ?? null;
    if (!analysis) return { error: 'Empty analysis from vision model.' };

    return { source, question: question ?? null, analysis };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Argument parsers — defensive, since the model may emit malformed JSON.
// We keep these separate from the ToolDefinition parameters schema so that
// narrowing bugs (missing/wrong-type fields) produce clear tool errors
// rather than TypeScript-level runtime crashes.
// ─────────────────────────────────────────────────────────────────────────────

function parseWebSearchArgs(args: unknown): {
  query: string;
  max_results?: number;
  gl?: string;
  hl?: string;
} {
  if (!isRecord(args)) {
    throw new Error('web_search arguments must be a JSON object.');
  }
  const query = args.query;
  if (typeof query !== 'string' || !query.trim()) {
    throw new Error('web_search requires a non-empty `query` string.');
  }
  const trimmed = query.trim().slice(0, 400);

  let max_results: number | undefined;
  if (args.max_results !== undefined) {
    const n = Number(args.max_results);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      throw new Error('web_search `max_results` must be an integer 1-10.');
    }
    max_results = n;
  }

  // Country / language hints — passed through to Serper untouched after a
  // shape check. We don't enumerate every possible code; Serper validates.
  let gl: string | undefined;
  if (args.gl !== undefined) {
    if (typeof args.gl !== 'string' || !/^[a-z]{2}$/.test(args.gl)) {
      throw new Error("web_search `gl` must be a 2-letter country code.");
    }
    gl = args.gl;
  }

  let hl: string | undefined;
  if (args.hl !== undefined) {
    if (typeof args.hl !== 'string' || !/^[a-z]{2}(-[a-zA-Z]{2,4})?$/.test(args.hl)) {
      throw new Error("web_search `hl` must be a language code (e.g. 'en').");
    }
    hl = args.hl;
  }

  return { query: trimmed, max_results, gl, hl };
}

function parseAnalyzeImageArgs(args: unknown): {
  source: string;
  question?: string;
} {
  if (!isRecord(args)) {
    throw new Error('analyze_image arguments must be a JSON object.');
  }
  const source = args.source;
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('analyze_image requires a non-empty `source` string.');
  }
  // Cap to avoid shipping a 50 MB data URI to Cloudflare.
  if (source.length > 14_000_000) {
    throw new Error('analyze_image source is too large (>10 MB).');
  }

  let question: string | undefined;
  if (args.question !== undefined) {
    if (typeof args.question !== 'string') {
      throw new Error('analyze_image `question` must be a string.');
    }
    question = args.question.slice(0, 4000);
  }

  return { source: source.trim(), question };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
