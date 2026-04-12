export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const tasks = await db.query.scheduledTasks.findMany({
      where: eq(schema.scheduledTasks.userId, payload.userId),
      orderBy: [desc(schema.scheduledTasks.createdAt)],
    });

    return NextResponse.json(tasks);
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

    const body = await req.json();

    const [task] = await db
      .insert(schema.scheduledTasks)
      .values({
        userId: payload.userId,
        name: body.name,
        description: body.description || '',
        prompt: body.prompt,
        model: body.model || 'anthropic/claude-opus-4.6',
        cronExpression: body.cronExpression,
        timezone: body.timezone || 'UTC',
        isActive: true,
      })
      .returning();

    return NextResponse.json(task);
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const { id, toggle } = await req.json();

    if (toggle) {
      const task = await db.query.scheduledTasks.findFirst({
        where: eq(schema.scheduledTasks.id, id),
      });
      if (task) {
        await db
          .update(schema.scheduledTasks)
          .set({ isActive: !task.isActive })
          .where(eq(schema.scheduledTasks.id, id));
      }
    }

    return NextResponse.json({ success: true });
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await db.delete(schema.scheduledTasks).where(eq(schema.scheduledTasks.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
