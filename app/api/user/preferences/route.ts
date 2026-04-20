export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, withErrors } from '@/lib/api-guard';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { badRequest, notFound } from '@/lib/errors';
import {
  DEFAULT_USER_PREFERENCES,
  UserPreferencesSchema,
} from '@/lib/validators';

/**
 * GET /api/user/preferences
 *
 * Returns the caller's preferences object, filling in defaults for any
 * missing fields so the client always gets a fully-populated shape.
 */
export const GET = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, auth.userId),
  });
  if (!user) throw notFound('User not found.');

  const raw =
    (user.settings as { preferences?: unknown } | null)?.preferences ?? {};
  // Normalize through the schema so downstream always gets defaults applied.
  const parsed = UserPreferencesSchema.safeParse(raw);
  const preferences = parsed.success ? parsed.data : DEFAULT_USER_PREFERENCES;

  return NextResponse.json(preferences);
});

/**
 * PATCH /api/user/preferences
 *
 * Accepts a partial preferences object (Zod .partial()). Unknown top-level
 * keys are rejected by the .strict() schema. Merges with any existing
 * preferences in users.settings.preferences.
 */
export const PATCH = withErrors(async (req: NextRequest) => {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => null);
  // Accept partial updates so clients don't need to send the whole object.
  const partial = UserPreferencesSchema.partial().safeParse(body);
  if (!partial.success) throw badRequest('Invalid preferences payload.');

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, auth.userId),
  });
  if (!user) throw notFound('User not found.');

  // Read-modify-write. Separate concurrent PATCHes against the same user
  // can still race; acceptable for user-driven settings. A real app would
  // move this column to a dedicated table with row-level locks.
  const existingSettings = (user.settings as Record<string, unknown> | null) ?? {};
  const existingPrefs =
    (existingSettings.preferences as Record<string, unknown> | undefined) ?? {};
  const mergedPrefs = { ...existingPrefs, ...partial.data };

  // Validate the FULL merged shape before writing. Ensures the on-disk
  // state is always schema-conformant, even if a partial update would have
  // produced an invalid combination (e.g. toolsEnabled missing a required key).
  const full = UserPreferencesSchema.safeParse(mergedPrefs);
  if (!full.success) {
    throw badRequest('Merged preferences failed schema validation.');
  }

  const nextSettings = { ...existingSettings, preferences: full.data };

  await db
    .update(schema.users)
    .set({ settings: nextSettings, updatedAt: new Date() })
    .where(eq(schema.users.id, auth.userId));

  return NextResponse.json(full.data);
});
