export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });
    }

    // Verify the conversation belongs to this user
    const conversation = await db.query.conversations.findFirst({
      where: eq(schema.conversations.id, conversationId),
    });
    if (!conversation || conversation.userId !== payload.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const messages = await db.query.messages.findMany({
      where: eq(schema.messages.conversationId, conversationId),
      orderBy: [asc(schema.messages.createdAt)],
    });

    return NextResponse.json(messages);
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { conversationId, role, content } = await req.json();

    if (!conversationId || !role || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the conversation belongs to this user
    const conversation = await db.query.conversations.findFirst({
      where: eq(schema.conversations.id, conversationId),
    });
    if (!conversation || conversation.userId !== payload.userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const [message] = await db
      .insert(schema.messages)
      .values({
        conversationId,
        role,
        content,
      })
      .returning();

    // Update conversation's updatedAt timestamp
    await db
      .update(schema.conversations)
      .set({ updatedAt: new Date() })
      .where(eq(schema.conversations.id, conversationId));

    return NextResponse.json(message);
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
