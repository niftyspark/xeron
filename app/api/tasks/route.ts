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
    const tasks = await db.query.scheduledTasks.findMany({
      where: eq(schema.scheduledTasks.userId, auth.userId),
      orderBy: [desc(schema.scheduledTasks.createdAt)],
    });
    return NextResponse.json(tasks);
  } catch (err: any) {
    console.error('GET tasks:', err?.message);
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req.headers);
    if (auth instanceof NextResponse) return auth;

    await ensureTables();
    const body = await req.json();
    if (!body.name || !body.prompt) {
      return NextResponse.json({ error: 'Name and prompt are required' }, { status: 400 });
    }

    const [task] = await db.insert(schema.scheduledTasks).values({
      userId: auth.userId,
      name: body.name,
      description: body.description || '',
      prompt: body.prompt,
      model: body.model || 'anthropic/claude-opus-4.6',
      cronExpression: body.cronExpression || '0 9 * * *',
      timezone: body.timezone || 'UTC',
      isActive: true,
    }).returning();

    return NextResponse.json(task);
  } catch (err: any) {
    console.error('POST tasks:', err?.message);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAuth(req.headers);
    if (auth instanceof NextResponse) return auth;

    const { id, toggle } = await req.json();
    if (toggle && id) {
      const task = await db.query.scheduledTasks.findFirst({
        where: and(eq(schema.scheduledTasks.id, id), eq(schema.scheduledTasks.userId, auth.userId)),
      });
      if (task) {
        await db.update(schema.scheduledTasks)
          .set({ isActive: !task.isActive })
          .where(eq(schema.scheduledTasks.id, id));
      }
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('PATCH tasks:', err?.message);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth(req.headers);
    if (auth instanceof NextResponse) return auth;

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await db.delete(schema.scheduledTasks).where(
      and(eq(schema.scheduledTasks.id, id), eq(schema.scheduledTasks.userId, auth.userId))
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE tasks:', err?.message);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}