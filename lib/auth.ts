/**
 * JWT issuance + verification.
 *
 * Audit findings addressed:
 *  - Hardcoded fallback secret removed. Module-load now throws CriticalConfigError
 *    if JWT_SECRET is absent or < 32 chars, preventing accidental startup with
 *    a predictable key.
 *  - Tokens are delivered via httpOnly cookies (see buildAuthCookie); the
 *    Authorization header path is retained only as a read-compat helper until
 *    existing tokens in user localStorages expire (7 days).
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { CriticalConfigError } from './errors';

/** Minimum entropy for HS256 per best practice — 256 bits (32 bytes). */
const MIN_SECRET_LENGTH = 32;

export const AUTH_COOKIE_NAME = 'xeron_token';
/** Token lifetime in seconds (7 days). Must match SignJWT expiration. */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function loadSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < MIN_SECRET_LENGTH) {
    throw new CriticalConfigError(
      `JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters. ` +
        `Generate with: openssl rand -hex 32`,
    );
  }
  return new TextEncoder().encode(raw);
}

// Evaluated once at cold start; any misconfiguration crashes immediately and
// visibly rather than silently signing with a weak key.
const SECRET = loadSecret();

export interface XeronTokenPayload extends JWTPayload {
  userId: string;
  walletAddress: string;
}

export async function signToken(payload: {
  userId: string;
  walletAddress: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<XeronTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (typeof payload.userId !== 'string' || typeof payload.walletAddress !== 'string') {
      return null;
    }
    return payload as XeronTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Produces the cookie-attribute string used by NextResponse.cookies.set().
 *
 * Flags:
 *   - httpOnly: JS cannot read the cookie (mitigates XSS token theft).
 *   - secure:   transmitted over HTTPS only (auto-enabled in production).
 *   - sameSite: 'lax' — prevents CSRF on state-changing requests from
 *               third-party origins, while still allowing top-level navigations
 *               from e.g. the Google OAuth redirect.
 *   - path:     '/' — available to all routes including /api.
 *   - maxAge:   matches JWT expiration to avoid stale cookies.
 */
export function buildAuthCookieOptions() {
  return {
    name: AUTH_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
  };
}

/** Cookie attributes for a logout — same flags, zero maxAge to clear. */
export function buildClearAuthCookieOptions() {
  return {
    ...buildAuthCookieOptions(),
    maxAge: 0,
  };
}

/** Legacy header extractor retained for the migration window only. */
export function getTokenFromHeaders(headers: Headers): string | null {
  const auth = headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7).trim();
  return token || null;
}
