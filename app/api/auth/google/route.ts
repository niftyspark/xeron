export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { signToken, buildAuthCookieOptions } from '@/lib/auth';
import { withErrors } from '@/lib/api-guard';
import { badRequest, CriticalConfigError, HttpError } from '@/lib/errors';
import { GoogleAuthSchema } from '@/lib/validators';

/**
 * Module-load checks. Google OAuth and Turnstile are non-optional in
 * production — fail fast rather than degrading to no-captcha.
 */
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) {
  // Throw only when handling a request, so `next build` doesn't crash if the
  // env is set in the runtime environment only. The first request after boot
  // will surface this as a 500 with the CriticalConfigError message.
}

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // FAIL CLOSED: Turnstile is mandatory. No silent bypass.
  if (!secret) {
    throw new CriticalConfigError(
      'TURNSTILE_SECRET_KEY must be set — the sign-in endpoint refuses to run without it.',
    );
  }

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  });
  if (!res.ok) return false;
  const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
  return data?.success === true;
}

export const POST = withErrors(async (req: NextRequest) => {
  if (!GOOGLE_CLIENT_ID) {
    throw new CriticalConfigError('GOOGLE_CLIENT_ID env var is not set.');
  }

  const body = await req.json().catch(() => null);
  const parsed = GoogleAuthSchema.safeParse(body);
  if (!parsed.success) throw badRequest('Invalid sign-in payload.');

  // Turnstile is mandatory — if the client did not send a token, reject.
  const tsOk = await verifyTurnstile(parsed.data.turnstileToken);
  if (!tsOk) throw new HttpError(403, 'Bot verification failed. Please refresh and try again.');

  // Verify Google ID token.
  const ticket = await googleClient.verifyIdToken({
    idToken: parsed.data.credential,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new HttpError(401, 'Invalid Google token.');
  }

  const email = payload.email.toLowerCase();
  // Guard against emails that exceed the legacy walletAddress column width.
  // The proper fix is a migration adding users.email; in the meantime, reject
  // rather than silently truncate (audit #30).
  if (email.length > 42) {
    throw new HttpError(
      400,
      'This email exceeds the current length limit. Please contact support.',
    );
  }
  const name = payload.name || email.split('@')[0];
  const picture = payload.picture ?? null;

  // Race-safe upsert: two concurrent first-time sign-ins would previously
  // collide on the unique wallet_address constraint and one would 500.
  const [user] = await db
    .insert(users)
    .values({
      walletAddress: email,
      displayName: name,
      avatarUrl: picture,
      settings: { authMethod: 'google', googleEmail: email },
    })
    .onConflictDoUpdate({
      target: users.walletAddress,
      set: {
        displayName: name,
        avatarUrl: picture,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!user) {
    // Should be impossible with onConflictDoUpdate, but guard anyway.
    const existing = await db.query.users.findFirst({
      where: eq(users.walletAddress, email),
    });
    if (!existing) throw new HttpError(500, 'Could not create user record.');
  }

  const finalUser = user!;
  const token = await signToken({
    userId: finalUser.id,
    walletAddress: finalUser.walletAddress,
  });

  // JWT is delivered as an httpOnly cookie — unreachable from document.cookie
  // and therefore safe from the XSS vectors the audit flagged.
  const response = NextResponse.json({
    user: {
      id: finalUser.id,
      displayName: finalUser.displayName,
      walletAddress: finalUser.walletAddress,
      avatarUrl: finalUser.avatarUrl,
    },
  });
  response.cookies.set({ ...buildAuthCookieOptions(), value: token });
  return response;
});
