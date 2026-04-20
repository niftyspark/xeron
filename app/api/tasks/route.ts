export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  assertTaskOwnership,
  withErrors,
} from '@/lib/api-guard';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { badRequest } from '@/lib/errors';
import { TaskCreateSchema, TaskUpdateSchema } from '@/lib/validators';
import { computeNextRun } from '@/lib/cron';

export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const tasks = await db.query.scheduledTasks.findMany({
    where: eq(schema.scheduledTasks.userId, auth.userId),
    orderBy: [desc(schema.scheduledTasks.createdAt)],
  });
  return NextResponse.json(tasks);
});

export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = TaskCreateSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? 'Invalid task payload.');
  }
  const input = parsed.data;

  // Compute the first nextRun NOW. Previously this was NULL and the
  // dispatcher query `lte(nextRun, now)` excluded new tasks forever.
  const { nextRun } = computeNextRun(input.cronExpression, input.timezone);

  const [task] = await db
    .insert(schema.scheduledTasks)
    .values({
      userId: auth.userId,
      name: input.name,
      description: input.description,
      prompt: input.prompt,
      model: input.model,
      cronExpression: input.cronExpression,
      timezone: input.timezone,
      isActive: true,
      nextRun,
    })
    .returning();

  return NextResponse.json(task);
});

/**
 * PATCH /api/tasks
 *
 * Two behaviours:
 *  - toggle-only: `{ id, toggle: true }` flips isActive.
 *  - edit: any subset of the mutable fields. Cron/timezone changes re-compute
 *    nextRun so the schedule takes effect on the next dispatcher tick.
 */
export const PATCH = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = TaskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? 'Invalid update payload.');
  }
  const { id, toggle, ...fields } = parsed.data;

  // Ownership — 404 on foreign/missing.
  const current = await assertTaskOwnership(id, auth.userId);

  // Toggle branch.
  if (toggle) {
    await db
      .update(schema.scheduledTasks)
      .set({ isActive: !current.isActive })
      .where(eq(schema.scheduledTasks.id, id));
    return NextResponse.json({ success: true, isActive: !current.isActive });
  }

  // Edit branch. Re-compute nextRun only if cron or timezone changed.
  const cronChanged =
    (fields.cronExpression && fields.cronExpression !== current.cronExpression) ||
    (fields.timezone && fields.timezone !== current.timezone);

  const updates: Partial<typeof schema.scheduledTasks.$inferInsert> = { ...fields };
  if (cronChanged) {
    const { nextRun } = computeNextRun(
      fields.cronExpression ?? current.cronExpression,
      fields.timezone ?? current.timezone ?? 'UTC',
    );
    updates.nextRun = nextRun;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: true });
  }

  await db
    .update(schema.scheduledTasks)
    .set(updates)
    .where(eq(schema.scheduledTasks.id, id));

  return NextResponse.json({ success: true });
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw badRequest('Missing task id.');

  await assertTaskOwnership(id, auth.userId);

  await db.delete(schema.scheduledTasks).where(eq(schema.scheduledTasks.id, id));
  return NextResponse.json({ success: true });
});
