export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth';
import { extractMemories, ChatMessage } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload?.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { conversationId, messages } = body;

    if (!conversationId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'conversationId and messages are required' },
        { status: 400 }
      );
    }

    const chatMessages: ChatMessage[] = messages.map((m: any) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content,
    }));

    await extractMemories(payload.userId, conversationId, chatMessages);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Extract memories error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
