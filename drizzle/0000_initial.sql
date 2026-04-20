-- Initial Drizzle migration generated from lib/schema.ts.
-- This file replaces the previous lib/ensure-tables.ts and /api/setup endpoint,
-- both of which duplicated DDL and drifted out of sync with schema.ts.
--
-- Apply with: `npm run db:push` (dev) or `drizzle-kit migrate` (CI).

CREATE TABLE IF NOT EXISTS "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "wallet_address" varchar(42) UNIQUE NOT NULL,
    "ens_name" varchar(255),
    "display_name" varchar(100),
    "avatar_url" text,
    "api_key_encrypted" text,
    "preferred_model" varchar(100) DEFAULT 'anthropic/claude-opus-4.6',
    "settings" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "conversations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" varchar(255),
    "model" varchar(100),
    "is_pinned" boolean DEFAULT false,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "conversations_user_id_idx" ON "conversations"("user_id");

CREATE TABLE IF NOT EXISTS "messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
    "role" varchar(20) NOT NULL,
    "content" text NOT NULL,
    "tool_calls" jsonb,
    "token_count" integer,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "messages_conversation_id_idx" ON "messages"("conversation_id");

CREATE TABLE IF NOT EXISTS "memories" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "category" varchar(50) NOT NULL,
    "content" text NOT NULL,
    "importance" double precision DEFAULT 0.5,
    "embedding" text,
    "source_conversation_id" uuid REFERENCES "conversations"("id"),
    "last_accessed" timestamp DEFAULT now(),
    "access_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "memories_user_active_idx" ON "memories"("user_id", "is_active");

CREATE TABLE IF NOT EXISTS "skills" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(100) NOT NULL,
    "slug" varchar(100) UNIQUE NOT NULL,
    "description" text,
    "category" varchar(50),
    "icon" varchar(50),
    "system_prompt" text,
    "tool_schema" jsonb,
    "is_builtin" boolean DEFAULT true,
    "is_enabled" boolean DEFAULT true,
    "config" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_skills" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "skill_id" uuid NOT NULL REFERENCES "skills"("id") ON DELETE CASCADE,
    "is_enabled" boolean DEFAULT true,
    "config" jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS "user_skills_user_idx" ON "user_skills"("user_id");

CREATE TABLE IF NOT EXISTS "scheduled_tasks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name" varchar(255) NOT NULL,
    "description" text,
    "prompt" text NOT NULL,
    "model" varchar(100),
    "skill_ids" jsonb DEFAULT '[]'::jsonb,
    "cron_expression" varchar(100) NOT NULL,
    "timezone" varchar(50) DEFAULT 'UTC',
    "is_active" boolean DEFAULT true,
    "last_run" timestamp,
    "next_run" timestamp,
    "run_count" integer DEFAULT 0,
    "last_result" jsonb,
    "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "scheduled_tasks_dispatcher_idx"
    ON "scheduled_tasks"("is_active", "next_run");

CREATE TABLE IF NOT EXISTS "task_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "task_id" uuid NOT NULL REFERENCES "scheduled_tasks"("id") ON DELETE CASCADE,
    "status" varchar(20) NOT NULL,
    "result" text,
    "tokens_used" integer,
    "duration_ms" integer,
    "error" text,
    "executed_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "task_logs_task_idx" ON "task_logs"("task_id");

CREATE TABLE IF NOT EXISTS "learning_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "trigger" varchar(50),
    "lesson" text NOT NULL,
    "applied_to" varchar(100),
    "confidence" double precision DEFAULT 0.5,
    "created_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "learning_logs_user_idx" ON "learning_logs"("user_id");

CREATE TABLE IF NOT EXISTS "models" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "provider" varchar(50) NOT NULL,
    "model_id" varchar(150) UNIQUE NOT NULL,
    "display_name" varchar(150) NOT NULL,
    "category" varchar(50),
    "context_window" integer,
    "is_free" boolean DEFAULT false,
    "supports_streaming" boolean DEFAULT true,
    "supports_function_calling" boolean DEFAULT false,
    "supports_vision" boolean DEFAULT false,
    "description" text,
    "icon_url" text,
    "tags" text[],
    "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "plan_id" varchar(20) UNIQUE NOT NULL,
    "name" varchar(50) NOT NULL,
    "price" integer NOT NULL,
    "period" varchar(20) NOT NULL,
    "tier" varchar(20) NOT NULL,
    "trial_days" integer,
    "features" jsonb NOT NULL,
    "limits" jsonb NOT NULL,
    "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_subscriptions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "subscription_id" uuid NOT NULL REFERENCES "subscriptions"("id"),
    "status" varchar(20) NOT NULL DEFAULT 'active',
    "trial_start" timestamp,
    "trial_end" timestamp,
    "current_period_start" timestamp NOT NULL,
    "current_period_end" timestamp NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_integrations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "integration_id" varchar(50) NOT NULL,
    "access_token" text,
    "refresh_token" text,
    "token_expires_at" timestamp,
    "config" jsonb DEFAULT '{}'::jsonb,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "user_integrations_user_idx" ON "user_integrations"("user_id");
