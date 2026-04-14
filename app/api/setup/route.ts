export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const TABLES_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  ens_name VARCHAR(255),
  display_name VARCHAR(100),
  avatar_url TEXT,
  api_key_encrypted TEXT,
  preferred_model VARCHAR(100) DEFAULT 'anthropic/claude-opus-4.6',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255),
  model VARCHAR(100),
  is_pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  tool_calls JSONB,
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  importance DOUBLE PRECISION DEFAULT 0.5,
  embedding TEXT,
  source_conversation_id UUID REFERENCES conversations(id),
  last_accessed TIMESTAMP DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50),
  icon VARCHAR(50),
  system_prompt TEXT,
  tool_schema JSONB,
  is_builtin BOOLEAN DEFAULT true,
  is_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS scheduled_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  model VARCHAR(100),
  skill_ids JSONB DEFAULT '[]',
  cron_expression VARCHAR(100) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  run_count INTEGER DEFAULT 0,
  last_result JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES scheduled_tasks(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) NOT NULL,
  result TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  error TEXT,
  executed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  trigger VARCHAR(50),
  lesson TEXT NOT NULL,
  applied_to VARCHAR(100),
  confidence DOUBLE PRECISION DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  model_id VARCHAR(150) UNIQUE NOT NULL,
  display_name VARCHAR(150) NOT NULL,
  category VARCHAR(50),
  context_window INTEGER,
  is_free BOOLEAN DEFAULT false,
  supports_streaming BOOLEAN DEFAULT true,
  supports_function_calling BOOLEAN DEFAULT false,
  supports_vision BOOLEAN DEFAULT false,
  description TEXT,
  icon_url TEXT,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  price INTEGER NOT NULL,
  period VARCHAR(20) NOT NULL,
  tier VARCHAR(20) NOT NULL,
  trial_days INTEGER,
  features JSONB NOT NULL,
  limits JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  integration_id VARCHAR(50) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
`;

export async function GET(req: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });
    }

    const sql = neon(databaseUrl);
    
    // Split and execute each CREATE TABLE statement
    const statements = TABLES_SQL.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const statement of statements) {
      await sql(statement);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Created ${statements.length} tables`,
      tables: [
        'users', 'conversations', 'messages', 'memories', 'skills', 
        'user_skills', 'scheduled_tasks', 'task_logs', 'learning_logs', 
        'models', 'subscriptions', 'user_subscriptions', 'user_integrations'
      ]
    });
  } catch (err: any) {
    console.error('Setup error:', err);
    return NextResponse.json({ error: err?.message || 'Setup failed' }, { status: 500 });
  }
}