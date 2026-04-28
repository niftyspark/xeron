/**
 * Central Zod schemas.
 *
 * Every API route now parses its input through one of these schemas instead of
 * hand-rolled `if (!field)` checks. Benefits:
 *   - Strict field sets (`.strict()`) reject unexpected keys — no field smuggling.
 *   - Consistent error envelopes: `{ error: '<detail>' }`.
 *   - TypeScript types are inferred with `z.infer<typeof Schema>` — no drift
 *     between the runtime shape and the compile-time type.
 */

import { z } from 'zod';
import parser from 'cron-parser';

// ─── Primitives ────────────────────────────────────────────────────────────

export const UuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Expected a UUID.',
  );

const ShortText = z.string().trim().min(1).max(255);
const LongText = z.string().trim().min(1).max(10_000);
const ModelId = z.string().trim().min(1).max(150);

// Cron expression validated with the same library the scheduler uses — no
// drift between "accepted" and "actually parseable" cron strings.
const CronSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine(
    (expr) => {
      try {
        parser.parseExpression(expr);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid cron expression.' },
  );

// IANA-style timezone string; parser.parseExpression will throw if it cannot
// resolve the tz, which is validated at schedule time.
const TimezoneSchema = z.string().trim().min(1).max(64);

// ─── Auth ──────────────────────────────────────────────────────────────────

export const GoogleAuthSchema = z
  .object({
    credential: z.string().min(20).max(4096),
    turnstileToken: z.string().min(1).max(4096),
  })
  .strict();

// ─── Conversations / Messages ─────────────────────────────────────────────

export const ConversationCreateSchema = z
  .object({
    title: ShortText.optional().transform((v) => (v?.length ? v : 'New Conversation')),
    model: ModelId.optional().transform((v) => v ?? 'llama-3.3-70b-versatile'),
  })
  .strict();

export const ConversationIdQuerySchema = z
  .object({
    conversationId: UuidSchema,
  })
  .strict();

export const MessageCreateSchema = z
  .object({
    conversationId: UuidSchema,
    role: z.enum(['user', 'assistant', 'system']),
    content: LongText,
  })
  .strict();

// ─── Memories ──────────────────────────────────────────────────────────────

const MemoryCategory = z.enum(['fact', 'preference', 'learned', 'episodic']);

export const MemoryCreateSchema = z
  .object({
    category: MemoryCategory.default('fact'),
    content: z.string().trim().min(1).max(2000),
    importance: z.number().min(0).max(1).default(0.5),
  })
  .strict();

export const MemoryListQuerySchema = z
  .object({
    category: MemoryCategory.optional(),
  })
  .strict();

export const MemoryDeleteBodySchema = z
  .object({
    clearAll: z.boolean().optional(),
  })
  .strict();

// ─── Scheduled Tasks ───────────────────────────────────────────────────────

export const TaskCreateSchema = z
  .object({
    name: ShortText,
    description: z.string().trim().max(2000).optional().default(''),
    prompt: z.string().trim().min(1).max(8000),
    model: ModelId.optional().transform((v) => v ?? 'llama-3.3-70b-versatile'),
    cronExpression: CronSchema,
    timezone: TimezoneSchema.optional().default('UTC'),
  })
  .strict();

export const TaskUpdateSchema = z
  .object({
    id: UuidSchema,
    toggle: z.literal(true).optional(),
    name: ShortText.optional(),
    description: z.string().trim().max(2000).optional(),
    prompt: z.string().trim().min(1).max(8000).optional(),
    model: ModelId.optional(),
    cronExpression: CronSchema.optional(),
    timezone: TimezoneSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

// ─── Learning ──────────────────────────────────────────────────────────────

export const LearningCreateSchema = z
  .object({
    trigger: z.string().trim().max(50).optional().default('manual'),
    lesson: z.string().trim().min(1).max(2000),
    appliedTo: z.string().trim().max(100).nullable().optional().default(null),
    confidence: z.number().min(0).max(1).default(0.5),
  })
  .strict();

// ─── User settings ─────────────────────────────────────────────────────────

/**
 * Per-user preferences that gate prompt composition on the server side of
 * /api/ai/chat. Every field has a safe default that matches the pre-
 * preferences behavior, so an unset column behaves identically to an
 * all-defaults row.
 *
 * `customSystemPrompt` is hard-capped to 8,000 chars. That cap exists for
 * two independent reasons:
 *   1. Cost — a user supplying a 200 KB system prompt would blow up token
 *      bills on every turn.
 *   2. Prompt-injection / exfiltration — the user OWNS their prompt and it
 *      replaces the Xeron persona entirely (they opted out explicitly), but
 *      we still don't want the field being used as a storage backdoor for
 *      someone else's content.
 */
export const UserPreferencesSchema = z
  .object({
    provider: z.enum(['groq', 'openai', 'cloudflare', 'huggingface', 'openrouter']).default('groq'),
    memoryEnabled: z.boolean().default(true),
    toolsEnabled: z
      .object({
        web_search: z.boolean().default(true),
        analyze_image: z.boolean().default(true),
      })
      .strict()
      .default({ web_search: true, analyze_image: true }),
    enabledSkillIds: z.array(z.string().max(64)).max(64).default([]),
    customSystemPrompt: z.string().max(8000).default(''),
  })
  .strict();

export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

/** Canonical defaults used when a user has no preferences row yet. */
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  provider: 'groq',
  memoryEnabled: true,
  toolsEnabled: { web_search: true, analyze_image: true },
  enabledSkillIds: [],
  customSystemPrompt: '',
};

// Strict whitelist — prevents arbitrary JSON blobs from being persisted.
export const UserSettingsSchema = z
  .object({
    theme: z.enum(['dark', 'light', 'neumorphism', 'cyberpunk']).optional(),
    authMethod: z.literal('google').optional(),
    googleEmail: z.string().email().max(254).optional(),
    preferences: UserPreferencesSchema.optional(),
  })
  .strict();

export const UserPatchSchema = z
  .object({
    displayName: z.string().trim().min(1).max(100).optional(),
    preferredModel: ModelId.optional(),
    settings: UserSettingsSchema.optional(),
  })
  .strict();

// ─── Composio integrations ────────────────────────────────────────────────

export const ComposioConnectSchema = z
  .object({
    toolkit: z.string().trim().min(1).max(100),
    redirectUrl: z.string().url().max(2048).optional(),
  })
  .strict();

export const ComposioDisconnectSchema = z
  .object({
    connectedAccountId: z.string().trim().min(1).max(200),
  })
  .strict();

export const ComposioExecuteSchema = z
  .object({
    tool: z.string().trim().min(1).max(200),
    params: z.record(z.unknown()).optional(),
  })
  .strict();

// ─── AI routes ────────────────────────────────────────────────────────────

const ChatMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().max(200_000),
  })
  .strict();

export const ChatRequestSchema = z
  .object({
    messages: z.array(ChatMessageSchema).min(1).max(200),
    model: ModelId.optional(),
    skills: z.array(z.string()).max(64).optional(),
    temperature: z.number().min(0).max(2).optional(),
  })
  .strict();

export const ExtractMemoriesSchema = z
  .object({
    conversationId: UuidSchema,
    messages: z.array(ChatMessageSchema).min(1).max(50),
  })
  .strict();

export const CodeAgentSchema = z
  .object({
    prompt: z.string().trim().min(1).max(20_000),
    files: z.record(z.string().max(200_000)).optional(),
    framework: z.enum(['html', 'react', 'vue', 'svelte', 'vanilla']).optional(),
    action: z.enum(['generate', 'edit', 'fix', 'explain']).optional(),
  })
  .strict();

export const ImageGenerateSchema = z
  .object({
    prompt: z.string().trim().min(1).max(2000),
    model: z
      .enum(['flux-schnell', 'flux-2-dev', 'sdxl', 'sdxl-lightning', 'dreamshaper'])
      .optional(),
    negativePrompt: z.string().max(2000).optional(),
    width: z.number().int().min(128).max(2048).optional(),
    height: z.number().int().min(128).max(2048).optional(),
    steps: z.number().int().min(1).max(50).optional(),
  })
  .strict();

export const AnalyzeImageSchema = z
  .object({
    // Accept either raw base64 or a data URI. Size bounded at ~10 MB of b64.
    image: z.string().min(16).max(14_000_000),
    prompt: z.string().trim().max(4000).optional(),
  })
  .strict();

// ─── Inferred types (used by routes) ──────────────────────────────────────

export type GoogleAuthInput = z.infer<typeof GoogleAuthSchema>;
export type TaskCreateInput = z.infer<typeof TaskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof TaskUpdateSchema>;
export type MessageCreateInput = z.infer<typeof MessageCreateSchema>;
export type MemoryCreateInput = z.infer<typeof MemoryCreateSchema>;
export type ChatRequestInput = z.infer<typeof ChatRequestSchema>;
export type ExtractMemoriesInput = z.infer<typeof ExtractMemoriesSchema>;
