/**
 * Centralised auth + IDOR protection for all /api routes.
 *
 * The audit identified horizontal privilege escalation in /api/messages,
 * /api/memories, /api/integrations, and /api/ai/extract-memories because
 * individual routes accepted client-supplied IDs without verifying ownership.
 *
 * This file exposes:
 *   - requireAuth(req): resolves { userId } or returns a sanitized NextResponse.
 *   - assertConversationOwnership(...): raises 404 for foreign/missing conversations.
 *   - assertMemoryOwnership(...): same for memories.
 *   - assertTaskOwnership(...): same for scheduled_tasks.
 *   - findConnectionForUser(...): scopes Composio connection IDs to the
 *     caller's userId by querying Composio's user-scoped list rather than
 *     fetching the connection by id (which previously broke the OAuth
 *     completion flow because Composio's response shape varies by SDK
 *     version and the owner field was sometimes absent).
 *
 * All ownership mismatches produce `notFound()` (404) — never 403 — to avoid
 * leaking the existence of another user's resources via ID enumeration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, AUTH_COOKIE_NAME } from './auth';
import { db, schema, isDbAvailable } from './db';
import { and, eq } from 'drizzle-orm';
import {
  HttpError,
  notFound,
  serviceUnavailable,
  unauthorized,
} from './errors';
import { getConnectedAccounts } from './composio';

export interface AuthContext {
  userId: string;
  walletAddress: string;
}

/**
 * Reads the session token from the httpOnly cookie set at login.
 *
 * Legacy Authorization: Bearer <token> header is still accepted so that
 * existing, unexpired tokens from localStorage continue to work during the
 * migration window — this is safe because verifyToken() enforces the same
 * signature check on both paths. New logins will only set the cookie.
 */
export function readToken(req: NextRequest): string | null {
  const cookie = req.cookies.get(AUTH_COOKIE_NAME);
  if (cookie?.value) return cookie.value;

  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const t = auth.slice(7).trim();
    if (t) return t;
  }
  return null;
}

/**
 * Primary auth gate. Returns AuthContext on success, or a ready-to-return
 * NextResponse on failure. Route handlers use the `instanceof NextResponse`
 * check to short-circuit.
 */
export async function requireAuth(
  req: NextRequest,
): Promise<AuthContext | NextResponse> {
  // Dev mode bypass - skip DB check in development
  if (!isDbAvailable() && process.env.NODE_ENV === 'development') {
    return { userId: 'dev-user', walletAddress: '' };
  }

  if (!isDbAvailable()) {
    return serviceUnavailable('Service temporarily unavailable. Please try again.').toResponse();
  }

  const token = readToken(req);
  
  // Dev mode bypass - allow requests without token in development
  if (!token && process.env.NODE_ENV === 'development') {
    return { userId: 'dev-user', walletAddress: '' };
  }
  
  if (!token) return unauthorized('Please sign in first.').toResponse();

  const payload = await verifyToken(token);
  if (!payload?.userId) {
    return unauthorized('Session expired. Please sign in again.').toResponse();
  }

  return { userId: payload.userId, walletAddress: payload.walletAddress };
}

/**
 * Higher-order wrapper: converts thrown HttpError into a response, unexpected
 * errors into a generic 500 with server-side logging. Use this to wrap route
 * bodies so you can throw freely without littering every handler with try/catch.
 *
 * Returns `Response | NextResponse` so streaming routes (SSE) can return a
 * plain `Response` built from a `ReadableStream`.
 */
export function withErrors<T extends unknown[]>(
  handler: (req: NextRequest, ...rest: T) => Promise<Response | NextResponse>,
) {
  return async (req: NextRequest, ...rest: T): Promise<Response | NextResponse> => {
    try {
      return await handler(req, ...rest);
    } catch (err) {
      if (err instanceof HttpError) return err.toResponse();
      // Log with correlation so ops can trace; never leak .message to client.
      const requestId = crypto.randomUUID();
      console.error(`[api-error] requestId=${requestId}`, err);
      return NextResponse.json(
        { error: 'Internal server error.', requestId },
        { status: 500 },
      );
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Ownership assertions. Each returns the resource row so callers avoid a
// duplicate fetch after the check.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Confirms that a conversation exists AND belongs to `userId`.
 * Throws notFound() (404) on any mismatch — we never reveal that a
 * conversation with that ID exists under a different owner.
 */
export async function assertConversationOwnership(
  conversationId: string,
  userId: string,
) {
  if (!isUuid(conversationId)) throw notFound();
  const row = await db.query.conversations.findFirst({
    where: and(
      eq(schema.conversations.id, conversationId),
      eq(schema.conversations.userId, userId),
    ),
  });
  if (!row) throw notFound();
  return row;
}

export async function assertMemoryOwnership(memoryId: string, userId: string) {
  if (!isUuid(memoryId)) throw notFound();
  const row = await db.query.memories.findFirst({
    where: and(
      eq(schema.memories.id, memoryId),
      eq(schema.memories.userId, userId),
    ),
  });
  if (!row) throw notFound();
  return row;
}

export async function assertTaskOwnership(taskId: string, userId: string) {
  if (!isUuid(taskId)) throw notFound();
  const row = await db.query.scheduledTasks.findFirst({
    where: and(
      eq(schema.scheduledTasks.id, taskId),
      eq(schema.scheduledTasks.userId, userId),
    ),
  });
  if (!row) throw notFound();
  return row;
}

/**
 * IDOR-safe Composio connection lookup.
 *
 * Earlier this file shipped `assertComposioConnectionOwnership` which fetched
 * a connection by id and then tried to read `userId` / `user_id` off the
 * response. That broke in production because Composio's response shape
 * differs across SDK versions (sometimes the owner key is `entity_id`,
 * sometimes nested under `metadata`, sometimes absent on certain auth
 * schemes). When the field wasn't where we expected, ownership was treated
 * as a mismatch and every status poll returned 404 — so the OAuth flow
 * never completed for users in the UI.
 *
 * The fix is to pivot the question. Instead of "fetch by id and check
 * owner", we ask Composio for "connections belonging to userId" and then
 * find the one with the requested id. Composio scopes the list query
 * server-side, so this is naturally IDOR-safe regardless of response shape:
 * a connection that doesn't belong to userId can't appear in the list.
 *
 * Throws notFound() (never 403) to avoid leaking existence of foreign rows.
 */
export async function findConnectionForUser(
  connectedAccountId: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const list = await getConnectedAccounts(userId);

  // Composio's list response is one of:
  //   - Array<Account>
  //   - { items: Array<Account> }
  //   - { data: Array<Account> }
  // Normalise to a flat array.
  const items: Array<Record<string, unknown>> = Array.isArray(list)
    ? (list as Array<Record<string, unknown>>)
    : Array.isArray((list as { items?: unknown[] }).items)
      ? ((list as { items: Array<Record<string, unknown>> }).items)
      : Array.isArray((list as { data?: unknown[] }).data)
        ? ((list as { data: Array<Record<string, unknown>> }).data)
        : [];

  const match = items.find((acct) => acct.id === connectedAccountId);
  if (!match) throw notFound();
  return match;
}

// Minimal UUID v4-ish check — rejects obvious garbage before hitting the DB.
function isUuid(value: string): boolean {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}
