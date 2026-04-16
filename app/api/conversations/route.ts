export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-guard';
import { db, schema } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';
import { ensureTables } from '@/lib/ensure-tables';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req.headers);
    if (auth instanceof NextResponse) return auth;

    await ensureTables();
    const conversations = await db.query.conversations.findMany({
      where: eq(schema.conversations.userId, auth.userId),
      orderBy: [desc(schema.conversations.updatedAt)],
    });
    return NextResponse.json(conversations);
  } catch (err: any) {
    console.error('GET conversations:', err?.message);
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req.headers);
    if (auth instanceof NextResponse) return auth;

    await ensureTables();
    const { title, model } = await req.json();

    const [conversation] = await db.insert(schema.conversations).values({
      userId: auth.userId,
      title: title || 'New Conversation',
      model: model || 'anthropic/claude-opus-4.6',
    }).returning();

    return NextResponse.json(conversation);
  } catch (err: any) {
    console.error('POST conversations:', err?.message);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req.headers);
    if (auth instanceof NextResponse) return auth;

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await db.delete(schema.conversations).where(
      and(eq(schema.conversations.id, id), eq(schema.conversations.userId, auth.userId))
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE conversations:', err?.message);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}