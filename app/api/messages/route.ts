export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-guard';
import { db, schema } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import { ensureTables } from '@/lib/ensure-tables';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req.headers);
    if (auth instanceof NextResponse) return auth;

    await ensureTables();
    const conversationId = new URL(req.url).searchParams.get('conversationId');
    if (!conversationId) return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 });

    const messages = await db.query.messages.findMany({
      where: eq(schema.messages.conversationId, conversationId),
      orderBy: [asc(schema.messages.createdAt)],
    });
    return NextResponse.json(messages);
  } catch (err: any) {
    console.error('GET messages:', err?.message);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req.headers);
    if (auth instanceof NextResponse) return auth;

    await ensureTables();
    const { conversationId, role, content } = await req.json();
    if (!conversationId || !role || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const [message] = await db.insert(schema.messages).values({
      conversationId, role, content,
    }).returning();

    await db.update(schema.conversations)
      .set({ updatedAt: new Date() })
      .where(eq(schema.conversations.id, conversationId));

    return NextResponse.json(message);
  } catch (err: any) {
    console.error('POST messages:', err?.message);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}