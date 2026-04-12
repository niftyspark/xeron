import { encrypt, decrypt } from './encryption';
import { db, schema } from './db';
import { eq } from 'drizzle-orm';

const API_URL = 'https://ai.api.4everland.org/api/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  messages: ChatMessage[];
}

async function getUserApiKey(userId: string): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
  });
  
  if (!user?.apiKeyEncrypted) return null;
  return decrypt(user.apiKeyEncrypted);
}

export async function getRelevantMemories(userId: string, query: string, limit = 5) {
  const memories = await db.query.memories.findMany({
    where: (memories, { and, eq }) =>
      and(eq(memories.userId, userId), eq(memories.isActive, true)),
    orderBy: (memories, { desc }) => [desc(memories.importance), desc(memories.accessCount)],
    limit,
  });
  
  return memories;
}

export function buildSystemPrompt(userId: string, memories: any[], skills: any[]): string {
  const basePrompt = `You are XERON, a highly capable autonomous AI agent on the Base blockchain. You have persistent memory, can execute tasks autonomously, and learn from interactions.

## Your Core Capabilities:
- Autonomous task execution and multi-step reasoning
- Persistent memory that persists across conversations
- Access to 1000+ AI models through unified API
- Web3 integration on Base blockchain
- Self-learning from user feedback and patterns

## Guidelines:
- Be proactive and suggest actions when appropriate
- Remember important details about the user
- Break complex tasks into manageable steps
- Show your reasoning process for complex queries
- Be concise but thorough`;

  if (memories.length > 0) {
    const memoryContext = memories
      .map(m => `- [${m.category}] ${m.content}`)
      .join('\n');
    return `${basePrompt}

## REMEMBERED CONTEXT:
${memoryContext}`;
  }

  return basePrompt;
}

export async function* streamChat(
  userId: string,
  options: ChatOptions
): AsyncGenerator<string, void, unknown> {
  const apiKey = await getUserApiKey(userId);
  
  if (!apiKey) {
    yield '⚠️ Please add your 4EverLand API key in Settings to use the AI.';
    return;
  }

  const { messages, model = 'anthropic/claude-opus-4.6', temperature = 0.7 } = options;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      repetition_penalty: 1,
      top_k: 0,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    yield `Error: ${response.status} - ${error}`;
    return;
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    yield 'Error: No response body';
    return;
  }

  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function extractMemories(
  userId: string,
  conversationId: string,
  messages: ChatMessage[]
): Promise<void> {
  const extractionPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
  
  const extractionMessages: ChatMessage[] = [
    {
      role: 'system',
      content: `Analyze this conversation and extract key facts, preferences, and learnings that should be remembered. 
Return a JSON array of memory objects with: category ("fact"|"preference"|"learned"), content (the memory text), importance (0.0-1.0).

Only extract information that is specific and actionable. Return empty array if nothing worth remembering.`
    },
    {
      role: 'user',
      content: extractionPrompt
    }
  ];

  const apiKey = await getUserApiKey(userId);
  if (!apiKey) return;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-opus-4.6',
        messages: extractionMessages,
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) return;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (content) {
      try {
        const memories = JSON.parse(content);
        if (Array.isArray(memories)) {
          for (const memory of memories) {
            await db.insert(schema.memories).values({
              userId,
              category: memory.category || 'fact',
              content: memory.content,
              importance: memory.importance || 0.5,
              sourceConversationId: conversationId,
            });
          }
        }
      } catch {
        // JSON parse failed, skip memory extraction
      }
    }
  } catch {
    // Network error, skip
  }
}
