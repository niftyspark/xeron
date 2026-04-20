export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  assertMemoryOwnership,
  withErrors,
} from '@/lib/api-guard';
import { db, schema } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';
import { badRequest } from '@/lib/errors';
import {
  MemoryCreateSchema,
  MemoryDeleteBodySchema,
  MemoryListQuerySchema,
} from '@/lib/validators';

/**
 * GET /api/memories?category=<optional>
 * Returns ACTIVE memories for the caller only.
 */
export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = MemoryListQuerySchema.safeParse({
    category: new URL(req.url).searchParams.get('category') || undefined,
  });
  if (!parsed.success) throw badRequest('Invalid category filter.');

  const conditions = [
    eq(schema.memories.userId, auth.userId),
    eq(schema.memories.isActive, true),
  ];
  if (parsed.data.category) {
    conditions.push(eq(schema.memories.category, parsed.data.category));
  }

  const memories = await db.query.memories.findMany({
    where: and(...conditions),
    orderBy: [desc(schema.memories.importance), desc(schema.memories.createdAt)],
  });
  return NextResponse.json(memories);
});

/**
 * POST /api/memories
 * Creates a memory owned by the caller. Strictly validates the body to
 * prevent user-supplied userId/isActive/createdAt field smuggling.
 */
export const POST = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = MemoryCreateSchema.safeParse(body);
  if (!parsed.success) throw badRequest('Invalid memory payload.');

  const [memory] = await db
    .insert(schema.memories)
    .values({
      userId: auth.userId,
      category: parsed.data.category,
      content: parsed.data.content,
      importance: parsed.data.importance,
    })
    .returning();

  return NextResponse.json(memory);
});

/**
 * DELETE /api/memories?id=<uuid>   or   body { clearAll: true }
 * - Single delete: verifies the memory is owned by the caller BEFORE updating.
 * - clearAll: only affects rows WHERE userId = caller.
 */
export const DELETE = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  // Parse optional body. Some clients send DELETE without a body; that's fine.
  const rawBody = await req.json().catch(() => null);
  if (rawBody !== null) {
    const parsedBody = MemoryDeleteBodySchema.safeParse(rawBody);
    if (parsedBody.success && parsedBody.data.clearAll) {
      await db
        .update(schema.memories)
        .set({ isActive: false })
        .where(
          and(
            eq(schema.memories.userId, auth.userId),
            eq(schema.memories.isActive, true),
          ),
        );
      return NextResponse.json({ success: true });
    }
  }

  const id = new URL(req.url).searchParams.get('id');
  if (!id) throw badRequest('Missing memory id.');

  // Throws 404 if the memory doesn't exist OR belongs to another user.
  await assertMemoryOwnership(id, auth.userId);

  await db
    .update(schema.memories)
    .set({ isActive: false })
    .where(
      and(
        eq(schema.memories.id, id),
        eq(schema.memories.userId, auth.userId),
      ),
    );

  return NextResponse.json({ success: true });
});
