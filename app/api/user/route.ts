export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { badRequest, notFound } from '@/lib/errors';
import { UserPatchSchema } from '@/lib/validators';
import { buildClearAuthCookieOptions } from '@/lib/auth';

export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, auth.userId),
  });
  if (!user) throw notFound('User not found.');

  return NextResponse.json({
    id: user.id,
    walletAddress: user.walletAddress,
    displayName: user.displayName,
    ensName: user.ensName,
    avatarUrl: user.avatarUrl,
    preferredModel: user.preferredModel,
    settings: user.settings,
    createdAt: user.createdAt,
  });
});

export const PATCH = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  const parsed = UserPatchSchema.safeParse(body);
  if (!parsed.success) throw badRequest('Invalid update payload.');

  // Drop undefined fields so we don't accidentally null-out columns.
  const updates: Partial<typeof schema.users.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (parsed.data.displayName !== undefined) updates.displayName = parsed.data.displayName;
  if (parsed.data.preferredModel !== undefined) {
    updates.preferredModel = parsed.data.preferredModel;
  }
  if (parsed.data.settings !== undefined) updates.settings = parsed.data.settings;

  await db.update(schema.users).set(updates).where(eq(schema.users.id, auth.userId));
  return NextResponse.json({ success: true });
});

export const DELETE = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  await db.delete(schema.users).where(eq(schema.users.id, auth.userId));

  // Clear the session cookie — the user no longer exists server-side.
  const response = NextResponse.json({ success: true, deleted: true });
  response.cookies.set({ ...buildClearAuthCookieOptions(), value: '' });
  return response;
});
