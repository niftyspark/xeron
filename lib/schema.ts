import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  doublePrecision,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  walletAddress: varchar('wallet_address', { length: 42 }).unique().notNull(),
  ensName: varchar('ens_name', { length: 255 }),
  displayName: varchar('display_name', { length: 100 }),
  avatarUrl: text('avatar_url'),
  apiKeyEncrypted: text('api_key_encrypted'),
  preferredModel: varchar('preferred_model', { length: 100 }).default('anthropic/claude-opus-4.6'),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }),
  model: varchar('model', { length: 100 }),
  isPinned: boolean('is_pinned').default(false),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => conversations.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  toolCalls: jsonb('tool_calls'),
  tokenCount: integer('token_count'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

export const memories = pgTable('memories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  content: text('content').notNull(),
  importance: doublePrecision('importance').default(0.5),
  embedding: text('embedding'),
  sourceConversationId: uuid('source_conversation_id').references(() => conversations.id),
  lastAccessed: timestamp('last_accessed').defaultNow(),
  accessCount: integer('access_count').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }),
  icon: varchar('icon', { length: 50 }),
  systemPrompt: text('system_prompt'),
  toolSchema: jsonb('tool_schema'),
  isBuiltin: boolean('is_builtin').default(true),
  isEnabled: boolean('is_enabled').default(true),
  config: jsonb('config').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userSkills = pgTable('user_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  skillId: uuid('skill_id').references(() => skills.id, { onDelete: 'cascade' }).notNull(),
  isEnabled: boolean('is_enabled').default(true),
  config: jsonb('config').default({}),
});

export const scheduledTasks = pgTable('scheduled_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  prompt: text('prompt').notNull(),
  model: varchar('model', { length: 100 }),
  skillIds: jsonb('skill_ids').default([]),
  cronExpression: varchar('cron_expression', { length: 100 }).notNull(),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  isActive: boolean('is_active').default(true),
  lastRun: timestamp('last_run'),
  nextRun: timestamp('next_run'),
  runCount: integer('run_count').default(0),
  lastResult: jsonb('last_result'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const taskLogs = pgTable('task_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => scheduledTasks.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  result: text('result'),
  tokensUsed: integer('tokens_used'),
  durationMs: integer('duration_ms'),
  error: text('error'),
  executedAt: timestamp('executed_at').defaultNow(),
});

export const learningLogs = pgTable('learning_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  trigger: varchar('trigger', { length: 50 }),
  lesson: text('lesson').notNull(),
  appliedTo: varchar('applied_to', { length: 100 }),
  confidence: doublePrecision('confidence').default(0.5),
  createdAt: timestamp('created_at').defaultNow(),
});

export const models = pgTable('models', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: varchar('provider', { length: 50 }).notNull(),
  modelId: varchar('model_id', { length: 150 }).unique().notNull(),
  displayName: varchar('display_name', { length: 150 }).notNull(),
  category: varchar('category', { length: 50 }),
  contextWindow: integer('context_window'),
  isFree: boolean('is_free').default(false),
  supportsStreaming: boolean('supports_streaming').default(true),
  supportsFunctionCalling: boolean('supports_function_calling').default(false),
  supportsVision: boolean('supports_vision').default(false),
  description: text('description'),
  iconUrl: text('icon_url'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at').defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Memory = typeof memories.$inferSelect;
export type NewMemory = typeof memories.$inferInsert;
export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;
export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type NewScheduledTask = typeof scheduledTasks.$inferInsert;
export type TaskLog = typeof taskLogs.$inferSelect;
export type NewTaskLog = typeof taskLogs.$inferInsert;
export type LearningLog = typeof learningLogs.$inferSelect;
export type NewLearningLog = typeof learningLogs.$inferInsert;
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
