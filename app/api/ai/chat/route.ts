export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSkillSystemPrompt } from '@/lib/skills';

const API_URL = 'https://ai.api.4everland.org/api/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model = 'anthropic/claude-opus-4.6', skills = [] } = body;

    // Use server-side API key from environment variable
    const apiKey = process.env.FOUR_EVER_LAND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI API key is not configured on the server' },
        { status: 500 }
      );
    }

    // Build system prompt with skills
    const basePrompt = `You are XERON, a highly capable autonomous AI agent on the Base blockchain. You have persistent memory, can execute tasks autonomously, and learn from interactions.

## Your Core Capabilities:
- Autonomous task execution and multi-step reasoning
- Persistent memory that persists across conversations
- Access to 1000+ AI models through unified API
- Web3 integration on Base blockchain
- Self-learning from user feedback and patterns
- 500+ app integrations via Composio (GitHub, Slack, Notion, Gmail, Discord, etc.)

## Tool Execution:
When a user asks you to perform an action on an external service (like creating a GitHub issue, sending a Slack message, etc.), tell them to connect the service first from the Tools page if not connected. If connected, describe the action you would take using the Composio tool system.

Available integration actions include:
- GITHUB_CREATE_ISSUE, GITHUB_CREATE_PR, GITHUB_STAR_REPO, etc.
- SLACK_SEND_MESSAGE, SLACK_CREATE_CHANNEL, etc.
- NOTION_CREATE_PAGE, NOTION_ADD_BLOCK, etc.
- GMAIL_SEND_EMAIL, GMAIL_GET_EMAILS, etc.
- And 1000+ more actions across 500+ apps.

## Guidelines:
- Be proactive and suggest actions when appropriate
- Remember important details about the user
- Break complex tasks into manageable steps
- Show your reasoning process for complex queries
- Be concise but thorough
- When users ask about integrations, explain they can connect apps from the Tools page`;

    const skillPrompt = getSkillSystemPrompt(skills);

    const enhancedMessages = [
      { role: 'system', content: basePrompt + skillPrompt },
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
