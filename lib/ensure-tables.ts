import { neon } from '@neondatabase/serverless';

let tablesCreated = false;

export async function ensureTables() {
  if (tablesCreated) return;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;

  try {
    const sql = neon(databaseUrl);

    await sql(`CREATE TABLE IF NOT EXISTS users (
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
    )`);

    await sql(`CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      title VARCHAR(255),
      model VARCHAR(100),
      is_pinned BOOLEAN DEFAULT false,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);

    await sql(`CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      tool_calls JSONB,
      token_count INTEGER,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    await sql(`CREATE TABLE IF NOT EXISTS memories (
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
    )`);

    await sql(`CREATE TABLE IF NOT EXISTS scheduled_tasks (
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
    )`);

    await sql(`CREATE TABLE IF NOT EXISTS task_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID REFERENCES scheduled_tasks(id) ON DELETE CASCADE NOT NULL,
      status VARCHAR(20) NOT NULL,
      result TEXT,
      tokens_used INTEGER,
      duration_ms INTEGER,
      error TEXT,
      executed_at TIMESTAMP DEFAULT NOW()
    )`);

    await sql(`CREATE TABLE IF NOT EXISTS learning_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      trigger VARCHAR(50),
      lesson TEXT NOT NULL,
      applied_to VARCHAR(100),
      confidence DOUBLE PRECISION DEFAULT 0.5,
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    tablesCreated = true;
  } catch (err) {
    console.error('ensureTables error:', err);
  }
}