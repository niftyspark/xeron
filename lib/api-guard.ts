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
 *   - assertComposioConnectionOwnership(...): scopes Composio connection IDs
 *     to the caller's userId (composio SDK uses our internal userId as its
 *     principal key, so this is a simple string comparison).
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
import { getConnectedAccount } from './composio';

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
  if (!isDbAvailable()) {
    return serviceUnavailable('Service temporarily unavailable. Please try again.').toResponse();
  }

  const token = readToken(req);
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
 * Composio does not expose per-connection owner metadata in a uniform shape,
 * but `composio.connectedAccounts.get(id)` returns the userId we passed when
 * initiating the connection. Since XERON always uses our internal users.id as
 * the Composio `userId`, a string comparison is sufficient and authoritative.
 */
export async function assertComposioConnectionOwnership(
  connectedAccountId: string,
  userId: string,
) {
  const account = await getConnectedAccount(connectedAccountId);
  // Composio returns userId under different keys depending on SDK version.
  const ownerId =
    (account as { userId?: string; user_id?: string }).userId ??
    (account as { user_id?: string }).user_id ??
    null;

  if (!ownerId || ownerId !== userId) throw notFound();
  return account;
}

// Minimal UUID v4-ish check — rejects obvious garbage before hitting the DB.
function isUuid(value: string): boolean {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}
