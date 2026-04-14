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
    const category = new URL(req.url).searchParams.get('category');

    const conditions: any[] = [eq(schema.memories.userId, auth.userId), eq(schema.memories.isActive, true)];
    if (category) conditions.push(eq(schema.memories.category, category));

    const memories = await db.query.memories.findMany({
      where: and(...conditions),
      orderBy: [desc(schema.memories.importance), desc(schema.memories.createdAt)],
    });
    return NextResponse.json(memories);
  } catch (err: any) {
    console.error('GET memories:', err?.message);
    return NextResponse.json({ error: 'Failed to load memories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req.headers);
    if (auth instanceof NextResponse) return auth;

    await ensureTables();
    const { category, content, importance } = await req.json();
    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    const [memory] = await db.insert(schema.memories).values({
      userId: auth.userId,
      category: category || 'fact',
      content,
      importance: importance || 0.5,
    }).returning();

    return NextResponse.json(memory);
  } catch (err: any) {
    console.error('POST memories:', err?.message);
    return NextResponse.json({ error: 'Failed to add memory' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req.headers);
    if (auth instanceof NextResponse) return auth;

    // Check for clearAll
    try {
      const body = await req.json();
      if (body?.clearAll) {
        await db.update(schema.memories)
          .set({ isActive: false })
          .where(and(eq(schema.memories.userId, auth.userId), eq(schema.memories.isActive, true)));
        return NextResponse.json({ success: true });
      }
    } catch {}

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await db.update(schema.memories).set({ isActive: false }).where(eq(schema.memories.id, id));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE memories:', err?.message);
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}