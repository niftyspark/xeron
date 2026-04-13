export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    const conditions = [eq(schema.memories.userId, payload.userId), eq(schema.memories.isActive, true)];
    if (category) {
      conditions.push(eq(schema.memories.category, category));
    }

    const memories = await db.query.memories.findMany({
      where: and(...conditions),
      orderBy: [desc(schema.memories.importance), desc(schema.memories.createdAt)],
    });

    return NextResponse.json(memories);
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

    const { category, content, importance } = await req.json();

    const [memory] = await db
      .insert(schema.memories)
      .values({
        userId: payload.userId,
        category: category || 'fact',
        content,
        importance: importance || 0.5,
      })
      .returning();

    return NextResponse.json(memory);
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    // Check for clearAll in request body
    try {
      const body = await req.json();
      if (body?.clearAll) {
        await db
          .update(schema.memories)
          .set({ isActive: false })
          .where(
            and(
              eq(schema.memories.userId, payload.userId),
              eq(schema.memories.isActive, true)
            )
          );
        return NextResponse.json({ success: true, cleared: true });
      }
    } catch {
      // No body or invalid JSON, fall through to single-delete by id
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id or clearAll' }, { status: 400 });

    await db
      .update(schema.memories)
      .set({ isActive: false })
      .where(eq(schema.memories.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
