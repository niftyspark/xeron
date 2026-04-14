export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSkillSystemPrompt } from '@/lib/skills';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth';
import { getRelevantMemories } from '@/lib/ai';

const API_URL = 'https://ai.api.4everland.org/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model = 'anthropic/claude-opus-4.6', skills = [] } = body;

    const apiKey = process.env.FOUR_EVER_LAND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI API key is not configured on the server' },
        { status: 500 }
      );
    }

    // ── Load user memories if authenticated ──────────────────────────
    let memoriesContext = '';
    const token = getTokenFromHeaders(req.headers);
    if (token) {
      try {
        const payload = await verifyToken(token);
        if (payload?.userId) {
          const memories = await getRelevantMemories(payload.userId as string, '', 10);
          if (memories.length > 0) {
            memoriesContext = '\n\n## YOUR PERSISTENT MEMORIES ABOUT THIS USER:\n' +
              memories.map(m => `- [${m.category}] ${m.content}`).join('\n') +
              '\n\nUse these memories to personalize your responses. Reference them when relevant. If the user tells you something new, acknowledge it.';
          }
        }
      } catch {
        // Auth failed, continue without memories
      }
    }

    // ── Build system prompt ──────────────────────────────────────────
    const basePrompt = `You are XERON, a highly capable autonomous AI agent on the Base blockchain. You have persistent memory, can execute tasks autonomously, and learn from interactions.

## Your Core Capabilities:
- Autonomous task execution and multi-step reasoning
- Persistent memory that persists across conversations
- Access to 1000+ AI models through unified API
- Web3 integration on Base blockchain
- Self-learning from user feedback and patterns
- 500+ app integrations via Composio (GitHub, Slack, Notion, Gmail, Discord, etc.)

## Persistent Memory:
You have a persistent memory system. Memories about the user are injected below (if any exist). When the user tells you personal facts, preferences, or important information, acknowledge that you will remember it. The system automatically extracts and saves memories after each conversation.

## Guidelines:
- Be proactive and suggest actions when appropriate
- Remember and reference details about the user from your memories
- Break complex tasks into manageable steps
- Show your reasoning process for complex queries
- Be concise but thorough
- When users ask about integrations, explain they can connect apps from the Tools page${memoriesContext}`;

    const skillPrompt = getSkillSystemPrompt(skills);

    const enhancedMessages = [
      { role: 'system', content: basePrompt + skillPrompt },
      ...messages.filter((m: any) => m.role !== 'system'),
    ];

    // ── Forward to 4everland API with streaming ─────────────────────
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: enhancedMessages,
        temperature: body.temperature || 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        repetition_penalty: 1,
        top_k: 0,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `AI API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              break;
            }
            controller.enqueue(value);
          }
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Chat API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}