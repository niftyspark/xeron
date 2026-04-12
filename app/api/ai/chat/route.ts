export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';
import { getRelevantMemories, buildSystemPrompt } from '@/lib/ai';
import { getSkillSystemPrompt } from '@/lib/skills';

const API_URL = 'https://ai.api.4everland.org/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { messages, model = 'anthropic/claude-opus-4.6', skills = [] } = body;

    // Get user's API key
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, payload.userId),
    });

    if (!user?.apiKeyEncrypted) {
      return NextResponse.json(
        { error: 'Please configure your API key in Settings' },
        { status: 400 }
      );
    }

    const apiKey = decrypt(user.apiKeyEncrypted);
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Failed to decrypt API key' },
        { status: 500 }
      );
    }

    // Build enhanced system prompt with memories and skills
    const memories = await getRelevantMemories(payload.userId, messages[messages.length - 1]?.content || '');
    const systemPrompt = buildSystemPrompt(payload.userId, memories, []);
    const skillPrompt = getSkillSystemPrompt(skills);

    const enhancedMessages = [
      { role: 'system', content: systemPrompt + skillPrompt },
      ...messages.filter((m: any) => m.role !== 'system'),
    ];

    // Forward to 4everland API with streaming
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

    // Stream the response through
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
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
